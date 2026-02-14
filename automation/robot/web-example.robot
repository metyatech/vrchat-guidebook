*** Settings ***
Resource    resources/doc_keywords.resource
Suite Setup    Setup Web Suite
Suite Teardown    Teardown Web Suite

*** Test Cases ***
Web Example Flow
    Doc Web Step    open-example    Open example.com    Open the example website top page.    Go To    https://example.com
    Doc Web Step    click-more-info    Click More information    Click the first link and open destination page.    Click Element    css:a

*** Keywords ***
Setup Web Suite
    Ensure Artifact Directories
    Open Web Browser    https://example.com

Teardown Web Suite
    Close Web Browser
