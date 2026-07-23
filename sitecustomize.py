"""Keep Robot Framework's generated PNG paths deterministic on CI."""

from pathlib import Path

from robot.libraries.BuiltIn import BuiltIn
from robot.libraries import Screenshot as screenshot_library


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
