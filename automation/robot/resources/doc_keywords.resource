*** Settings ***
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
    ${image_path}=    Set Variable    ${OUTPUT DIR}${/}screenshots${/}${id}.png
    Capture Page Screenshot    ${image_path}

Doc Desktop Step
    [Arguments]    ${id}    ${title}    ${description}    ${keyword}    @{args}
    Ensure Artifact Directories
    Run Keyword    ${keyword}    @{args}
    ${image_path}=    Set Variable    ${OUTPUT DIR}${/}screenshots${/}${id}.png
    Take Screenshot    ${image_path}

Execute Unity Editor Flow
    Ensure Artifact Directories
    ${manifest_path}=    Set Variable    ${OUTPUT DIR}${/}unity-manifest.json
    ${result}=    Run Process    python    automation/unity/run-unity-editor-flow.py    --output-dir    ${OUTPUT DIR}    --manifest-path    ${manifest_path}    stdout=${OUTPUT DIR}${/}robot${/}unity.out    stderr=${OUTPUT DIR}${/}robot${/}unity.err
    Should Be Equal As Integers    ${result.rc}    0
