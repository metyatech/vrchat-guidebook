"""Keep Robot Framework's generated artifacts deterministic on CI."""

import os

from pathlib import Path

from robot.libraries.BuiltIn import BuiltIn
from robot.libraries import Screenshot as screenshot_library
from SeleniumLibrary.keywords.webdrivertools.webdrivertools import WebDriverCreator
from selenium import webdriver


_original_take_screenshot = screenshot_library.Screenshot.take_screenshot


def _take_screenshot(self, name="screenshot", width="800px"):
    if isinstance(name, str) and name.lower().endswith(".png"):
        selenium = BuiltIn().get_library_instance("SeleniumLibrary")
        path = Path(name)
        if path.parent.name.lower() == "screenshots" and path.parent.parent.name.lower() == "robot":
            path = path.parent.parent.parent / "screenshots" / path.name
        path.parent.mkdir(parents=True, exist_ok=True)
        return selenium.capture_page_screenshot(str(path))
    return _original_take_screenshot(self, name, width)


screenshot_library.Screenshot.take_screenshot = _take_screenshot


_original_create_chrome = WebDriverCreator.create_chrome


def _create_chrome(
    self,
    desired_capabilities,
    remote_url,
    options=None,
    service_log_path=None,
    executable_path=None,
    service=None,
):
    if os.name != "nt":
        options = options or webdriver.ChromeOptions()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
    return _original_create_chrome(
        self,
        desired_capabilities,
        remote_url,
        options=options,
        service_log_path=service_log_path,
        executable_path=executable_path,
        service=service,
    )


WebDriverCreator.create_chrome = _create_chrome
