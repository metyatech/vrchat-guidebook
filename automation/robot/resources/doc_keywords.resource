*** Settings ***
Library    Collections
Library    SeleniumLibrary
Library    Process
Library    Screenshot
Library    OperatingSystem

*** Keywords ***
Ensure Artifact Directories
    Create Directory    ${OUTPUT DIR}${/}screenshots
    Create Directory    ${OUTPUT DIR}${/}robot

Open Web Browser
    [Arguments]    ${url}
    Open Browser    ${url}    chrome
    Maximize Browser Window

Close Web Browser
    Close All Browsers

Doc Web Step
    [Arguments]    ${id}    ${title}    ${description}    ${keyword}    @{args}
    Ensure Artifact Directories
    Run Keyword    ${keyword}    @{args}
    Save Step Screenshot    ${id}

Doc Web Click Step
    [Arguments]    ${id}    ${title}    ${description}    ${locator}
    Ensure Artifact Directories
    ${box}=    Get Element Screen Box    ${locator}
    Click Element    ${locator}
    Save Step Screenshot    ${id}
    ${box_dict}=    Create Dictionary    x=${box}[0]    y=${box}[1]    width=${box}[2]    height=${box}[3]
    ${annotation}=    Create Dictionary    type=click    box=${box_dict}
    ${metadata}=    Create Dictionary    annotation=${annotation}
    Emit Step Metadata    ${metadata}

Doc Web Drag Step
    [Arguments]    ${id}    ${title}    ${description}    ${source_locator}    ${target_locator}
    Ensure Artifact Directories
    ${source}=    Get Element Screen Box    ${source_locator}
    ${target}=    Get Element Screen Box    ${target_locator}
    Drag And Drop    ${source_locator}    ${target_locator}
    Save Step Screenshot    ${id}
    ${from_point}=    Create Dictionary    x=${source}[4]    y=${source}[5]
    ${to_point}=    Create Dictionary    x=${target}[4]    y=${target}[5]
    ${annotation}=    Create Dictionary    type=dragDrop    from=${from_point}    to=${to_point}
    ${metadata}=    Create Dictionary    annotation=${annotation}
    Emit Step Metadata    ${metadata}

Doc Desktop Step
    [Arguments]    ${id}    ${title}    ${description}    ${keyword}    @{args}
    Ensure Artifact Directories
    Run Keyword    ${keyword}    @{args}
    Save Step Screenshot    ${id}

Save Step Screenshot
    [Arguments]    ${id}
    ${image_path}=    Set Variable    ${OUTPUT DIR}${/}screenshots${/}${id}.png
    Take Screenshot    ${image_path}

Emit Step Metadata
    [Arguments]    ${metadata}
    ${payload}=    Evaluate    json.dumps($metadata, ensure_ascii=False)    modules=json
    Log    DOCMETA:${payload}

Normalize Css Selector
    [Arguments]    ${locator}
    ${selector}=    Set Variable    ${locator}
    ${is_css}=    Evaluate    str($locator).startswith("css:")
    IF    ${is_css}
        ${selector}=    Evaluate    str($locator)[4:]
    END
    RETURN    ${selector}

Get Element Screen Box
    [Arguments]    ${locator}
    ${selector}=    Normalize Css Selector    ${locator}
    ${box}=    Execute JavaScript    const selector = arguments[0]; const el = document.querySelector(selector); if (!el) { return null; } const rect = el.getBoundingClientRect(); const sx = window.screenX ?? window.screenLeft ?? 0; const sy = window.screenY ?? window.screenTop ?? 0; const viewportX = sx + Math.max(0, (window.outerWidth - window.innerWidth) / 2); const viewportY = sy + Math.max(0, window.outerHeight - window.innerHeight); return [Math.round(viewportX + rect.left), Math.round(viewportY + rect.top), Math.round(rect.width), Math.round(rect.height), Math.round(viewportX + rect.left + rect.width / 2), Math.round(viewportY + rect.top + rect.height / 2)];    ARGUMENTS    ${selector}
    Should Not Be Equal    ${box}    ${None}
    RETURN    ${box}

Execute Unity Editor Flow
    Ensure Artifact Directories
    ${manifest_path}=    Set Variable    ${OUTPUT DIR}${/}unity-manifest.json
    ${result}=    Run Process    python    automation/unity/run-unity-editor-flow.py    --output-dir    ${OUTPUT DIR}    --manifest-path    ${manifest_path}    stdout=${OUTPUT DIR}${/}robot${/}unity.out    stderr=${OUTPUT DIR}${/}robot${/}unity.err
    Should Be Equal As Integers    ${result.rc}    0
