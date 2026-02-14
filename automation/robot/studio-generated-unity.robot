*** Settings ***
Library    Collections
Library    robotframework_unity_editor.UnityEditorLibrary

*** Test Cases ***
studio-generated-unity
    Set Unity Output Directory    ${OUTPUT DIR}
    ${project_path}=    Set Variable    ${OUTPUT DIR}${/}unity-sample-project
    TRY
        Start Unity Editor    project_path=${project_path}
        Focus Unity Window
        # Open menu
        ${annotation}=    Click Unity Relative    0.07    0.05    box_width=180    box_height=48
        Wait For Seconds    0.8
        Emit Annotation Metadata    ${annotation}
        # Drag object
        ${annotation}=    Drag Unity Relative    0.22    0.43    0.68    0.45
        Wait For Seconds    0.8
        Emit Annotation Metadata    ${annotation}
        # Save
        Send Unity Shortcut    CTRL+S
    FINALLY
        Stop Unity Editor
    END

*** Keywords ***
Emit Annotation Metadata
    [Arguments]    ${annotation}
    ${metadata}=    Create Dictionary    annotation=${annotation}
    Emit DOCMETA    ${metadata}
