#!/usr/bin/env python
"""Run Unity Editor operations and emit a command-driver manifest."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageGrab
from pywinauto import Application, Desktop, mouse


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--manifest-path", required=True)
    parser.add_argument("--unity-exe")
    parser.add_argument("--project-path")
    parser.add_argument("--startup-timeout-seconds", type=int, default=420)
    return parser.parse_args()


def find_unity_exe(explicit_path: str | None) -> Path:
    if explicit_path:
        path = Path(explicit_path)
        if path.exists():
            return path
        raise FileNotFoundError(f"Unity executable was not found: {path}")

    env_path = os.environ.get("UNITY_EDITOR_EXE")
    if env_path:
        path = Path(env_path)
        if path.exists():
            return path
        raise FileNotFoundError(f"UNITY_EDITOR_EXE does not exist: {path}")

    candidates: list[Path] = []
    hub_root = Path(r"C:\Program Files\Unity\Hub\Editor")
    if hub_root.exists():
        candidates.extend(sorted(hub_root.glob("*/Editor/Unity.exe"), reverse=True))

    direct = Path(r"C:\Program Files\Unity\Editor\Unity.exe")
    if direct.exists():
        candidates.append(direct)

    if not candidates:
        raise FileNotFoundError("Could not locate Unity.exe. Set UNITY_EDITOR_EXE or pass --unity-exe.")

    return candidates[0]


def ensure_project(unity_exe: Path, project_path: Path, output_dir: Path) -> None:
    if (project_path / "ProjectSettings").exists():
        return

    project_path.mkdir(parents=True, exist_ok=True)
    log_path = output_dir / "unity-create-project.log"
    command = [
        str(unity_exe),
        "-batchmode",
        "-quit",
        "-createProject",
        str(project_path),
        "-logFile",
        str(log_path),
    ]
    result = subprocess.run(command, check=False, timeout=1800)
    if result.returncode != 0:
        raise RuntimeError(f"Failed to create Unity project at '{project_path}'. See {log_path}")


def start_screen_recording(raw_video_path: Path) -> subprocess.Popen[bytes]:
    command = [
        "ffmpeg",
        "-y",
        "-f",
        "gdigrab",
        "-framerate",
        "15",
        "-draw_mouse",
        "1",
        "-i",
        "desktop",
        "-vf",
        "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-preset",
        "ultrafast",
        str(raw_video_path),
    ]
    return subprocess.Popen(
        command,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def stop_screen_recording(recording_process: subprocess.Popen[bytes]) -> None:
    if recording_process.poll() is not None:
        return

    if recording_process.stdin:
        try:
            recording_process.stdin.write(b"q\n")
            recording_process.stdin.flush()
        except OSError:
            pass

    try:
        recording_process.wait(timeout=20)
    except subprocess.TimeoutExpired:
        recording_process.kill()
        recording_process.wait(timeout=10)


def launch_unity(unity_exe: Path, project_path: Path) -> subprocess.Popen[bytes]:
    command = [str(unity_exe), "-projectPath", str(project_path)]
    return subprocess.Popen(command)


def wait_for_unity_window(process_id: int, timeout_seconds: int):
    deadline = time.time() + timeout_seconds
    last_error: Exception | None = None

    while time.time() < deadline:
        try:
            app = Application(backend="uia").connect(process=process_id)
            window = app.top_window()
            if window.exists() and window.is_visible():
                return window
        except Exception as error:  # pragma: no cover - integration path
            last_error = error

        time.sleep(2)

    if last_error:
        raise RuntimeError(f"Unity window was not detected: {last_error}") from last_error

    raise RuntimeError("Unity window was not detected before timeout.")


def stabilize_unity_window(process_id: int, timeout_seconds: int):
    deadline = time.time() + timeout_seconds
    last_error: Exception | None = None

    while time.time() < deadline:
        try:
            window = wait_for_unity_window(process_id, 10)
            rect = window.rectangle()
            if (rect.right - rect.left) > 320 and (rect.bottom - rect.top) > 240:
                return (window, rect)
        except Exception as error:
            last_error = error
        time.sleep(1)

    if last_error:
        raise RuntimeError(f"Unity window was not stable: {last_error}") from last_error
    raise RuntimeError("Unity window was not stable before timeout.")


def capture_window(window, output_path: Path) -> None:
    rect = window.rectangle()
    image = ImageGrab.grab((rect.left, rect.top, rect.right, rect.bottom), all_screens=True)
    image.save(output_path)


def annotate_click_screenshot(image_path: Path, click_box: tuple[int, int, int, int]) -> None:
    image = Image.open(image_path).convert("RGBA")
    draw = ImageDraw.Draw(image)
    draw.rectangle(click_box, outline="#ff0000", width=5)
    image.save(image_path)


def annotate_drag_screenshot(
    image_path: Path,
    drag_from: tuple[int, int],
    drag_to: tuple[int, int],
) -> None:
    image = Image.open(image_path).convert("RGBA")
    draw = ImageDraw.Draw(image)
    draw.rectangle((drag_from[0] - 12, drag_from[1] - 12, drag_from[0] + 12, drag_from[1] + 12), fill="#ff0000")
    draw.rectangle((drag_to[0] - 12, drag_to[1] - 12, drag_to[0] + 12, drag_to[1] + 12), fill="#ff0000")
    draw.line((drag_from[0], drag_from[1], drag_to[0], drag_to[1]), fill="#ff0000", width=6)
    draw_arrow_head(draw, drag_from, drag_to)
    image.save(image_path)


def draw_arrow_head(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int]) -> None:
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length = max((dx**2 + dy**2) ** 0.5, 1.0)
    ux = dx / length
    uy = dy / length

    size = 16
    left = (end[0] - ux * size - uy * (size / 2), end[1] - uy * size + ux * (size / 2))
    right = (end[0] - ux * size + uy * (size / 2), end[1] - uy * size - ux * (size / 2))
    draw.polygon([end, left, right], fill="#ff0000")


def write_video_overlay(
    overlay_path: Path,
    frame_size: tuple[int, int],
    click_box: tuple[int, int, int, int] | None,
    drag_from: tuple[int, int] | None,
    drag_to: tuple[int, int] | None,
) -> None:
    image = Image.new("RGBA", frame_size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    if click_box is not None:
        draw.rectangle(click_box, outline="#ff0000", width=6)

    if drag_from is not None and drag_to is not None:
        draw.rectangle((drag_from[0] - 12, drag_from[1] - 12, drag_from[0] + 12, drag_from[1] + 12), fill="#ff0000")
        draw.rectangle((drag_to[0] - 12, drag_to[1] - 12, drag_to[0] + 12, drag_to[1] + 12), fill="#ff0000")
        draw.line((drag_from[0], drag_from[1], drag_to[0], drag_to[1]), fill="#ff0000", width=6)
        draw_arrow_head(draw, drag_from, drag_to)

    image.save(overlay_path)


def render_annotated_video(
    raw_video_path: Path,
    output_video_path: Path,
    click_overlay_path: Path,
    click_seconds: tuple[float, float],
    drag_overlay_path: Path,
    drag_seconds: tuple[float, float],
) -> None:
    filter_graph = (
        f"[0:v][1:v]overlay=0:0:enable='between(t,{click_seconds[0]},{click_seconds[1]})'[v1];"
        f"[v1][2:v]overlay=0:0:enable='between(t,{drag_seconds[0]},{drag_seconds[1]})'[v2]"
    )
    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(raw_video_path),
        "-i",
        str(click_overlay_path),
        "-i",
        str(drag_overlay_path),
        "-filter_complex",
        filter_graph,
        "-map",
        "[v2]",
        str(output_video_path),
    ]
    result = subprocess.run(command, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"Failed to render annotated video: {output_video_path}")


def probe_video_size(video_path: Path) -> tuple[int, int]:
    command = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "csv=s=x:p=0",
        str(video_path),
    ]
    result = subprocess.run(command, check=False, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Failed to probe video size: {video_path}")

    text = result.stdout.strip()
    width_text, height_text = text.split("x", maxsplit=1)
    return (int(width_text), int(height_text))


def scale_point(point: tuple[int, int], source_size: tuple[int, int], target_size: tuple[int, int]) -> tuple[int, int]:
    x = round(point[0] * target_size[0] / source_size[0])
    y = round(point[1] * target_size[1] / source_size[1])
    return (x, y)


def scale_box(
    box: tuple[int, int, int, int],
    source_size: tuple[int, int],
    target_size: tuple[int, int],
) -> tuple[int, int, int, int]:
    left, top = scale_point((box[0], box[1]), source_size, target_size)
    right, bottom = scale_point((box[2], box[3]), source_size, target_size)
    return (left, top, right, bottom)


def safe_kill_process(process_id: int) -> None:
    subprocess.run(
        ["taskkill", "/PID", str(process_id), "/T", "/F"],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def to_seconds(start_ms: int, end_ms: int, baseline_ms: int) -> tuple[float, float]:
    start = max(0.0, (start_ms - baseline_ms) / 1000)
    end = max(start + 0.6, (end_ms - baseline_ms) / 1000)
    return (round(start, 2), round(end, 2))


def main() -> int:
    args = parse_args()

    output_dir = Path(args.output_dir).resolve()
    manifest_path = Path(args.manifest_path).resolve()
    screenshots_dir = output_dir / "screenshots"
    video_dir = output_dir / "video"
    screenshots_dir.mkdir(parents=True, exist_ok=True)
    video_dir.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    unity_exe = find_unity_exe(args.unity_exe)
    project_path = (
        Path(args.project_path).resolve()
        if args.project_path
        else Path(os.environ.get("UNITY_AUTOMATION_PROJECT_PATH", str(output_dir / "unity-sample-project"))).resolve()
    )

    ensure_project(unity_exe, project_path, output_dir)

    raw_video_path = video_dir / "unity-basic-raw.mp4"
    annotated_video_path = video_dir / "unity-basic-annotated.mp4"
    click_overlay_path = video_dir / "overlay-click.png"
    drag_overlay_path = video_dir / "overlay-drag.png"

    recording_started_at_ms = int(time.time() * 1000)
    recording_process = start_screen_recording(raw_video_path)
    unity_process: subprocess.Popen[bytes] | None = None

    try:
        time.sleep(1.2)
        if recording_process.poll() is not None:
            raise RuntimeError("Screen recording process exited before Unity launch.")

        unity_process = launch_unity(unity_exe, project_path)
        window = wait_for_unity_window(unity_process.pid, args.startup_timeout_seconds)
        time.sleep(2)
        try:
            window.maximize()
        except Exception:
            pass
        # UIA handle can become stale right after maximize. Re-acquire and fallback to click focus.
        window = wait_for_unity_window(unity_process.pid, 30)
        try:
            window.set_focus()
        except Exception:
            rect = window.rectangle()
            mouse.click(coords=(rect.left + 36, rect.top + 24))
        time.sleep(1)

        window, window_rect = stabilize_unity_window(unity_process.pid, 45)
        width = window_rect.right - window_rect.left
        height = window_rect.bottom - window_rect.top

        click_x = window_rect.left + max(80, int(width * 0.07))
        click_y = window_rect.top + max(50, int(height * 0.05))
        click_box_abs = (click_x - 90, click_y - 24, click_x + 90, click_y + 24)

        step1_start = int(time.time() * 1000)
        mouse.click(coords=(click_x, click_y))
        time.sleep(0.8)
        step1_end = int(time.time() * 1000)

        screenshot_open = screenshots_dir / "open-unity-editor.png"
        capture_window(window, screenshot_open)
        annotate_click_screenshot(
            screenshot_open,
            (
                click_box_abs[0] - window_rect.left,
                click_box_abs[1] - window_rect.top,
                click_box_abs[2] - window_rect.left,
                click_box_abs[3] - window_rect.top,
            ),
        )
        mouse.click(coords=(click_x, click_y))
        time.sleep(0.4)

        drag_from_abs = (
            window_rect.left + int(width * 0.22),
            window_rect.top + int(height * 0.43),
        )
        drag_to_abs = (
            window_rect.left + int(width * 0.68),
            window_rect.top + int(height * 0.45),
        )

        step2_start = int(time.time() * 1000)
        mouse.press(coords=drag_from_abs)
        time.sleep(0.2)
        mouse.move(coords=drag_to_abs)
        time.sleep(0.2)
        mouse.release(coords=drag_to_abs)
        time.sleep(0.8)
        step2_end = int(time.time() * 1000)

        screenshot_drag = screenshots_dir / "drag-hierarchy-item.png"
        capture_window(window, screenshot_drag)
        annotate_drag_screenshot(
            screenshot_drag,
            (drag_from_abs[0] - window_rect.left, drag_from_abs[1] - window_rect.top),
            (drag_to_abs[0] - window_rect.left, drag_to_abs[1] - window_rect.top),
        )

        safe_kill_process(unity_process.pid)
        stop_screen_recording(recording_process)

        desktop_frame = ImageGrab.grab(all_screens=True)
        desktop_size = desktop_frame.size
        video_size = probe_video_size(raw_video_path)
        click_box_video = scale_box(click_box_abs, desktop_size, video_size)
        drag_from_video = scale_point(drag_from_abs, desktop_size, video_size)
        drag_to_video = scale_point(drag_to_abs, desktop_size, video_size)
        write_video_overlay(click_overlay_path, video_size, click_box_video, None, None)
        write_video_overlay(drag_overlay_path, video_size, None, drag_from_video, drag_to_video)
        render_annotated_video(
            raw_video_path,
            annotated_video_path,
            click_overlay_path,
            to_seconds(step1_start, step1_end, recording_started_at_ms),
            drag_overlay_path,
            to_seconds(step2_start, step2_end, recording_started_at_ms),
        )

        manifest: dict[str, Any] = {
            "steps": [
                {
                    "id": "open-unity-editor",
                    "title": "Open Unity Editor",
                    "description": "Launch Unity Editor and open the top menu.",
                    "imagePath": str(screenshot_open),
                    "annotation": {
                        "type": "click",
                        "box": {
                            "x": click_box_abs[0] - window_rect.left,
                            "y": click_box_abs[1] - window_rect.top,
                            "width": click_box_abs[2] - click_box_abs[0],
                            "height": click_box_abs[3] - click_box_abs[1],
                        },
                    },
                    "startedAtMs": step1_start,
                    "endedAtMs": step1_end,
                },
                {
                    "id": "drag-hierarchy-item",
                    "title": "Drag item to Scene view",
                    "description": "Perform a drag gesture inside Unity Editor.",
                    "imagePath": str(screenshot_drag),
                    "annotation": {
                        "type": "dragDrop",
                        "from": {
                            "x": drag_from_abs[0] - window_rect.left,
                            "y": drag_from_abs[1] - window_rect.top,
                        },
                        "to": {
                            "x": drag_to_abs[0] - window_rect.left,
                            "y": drag_to_abs[1] - window_rect.top,
                        },
                    },
                    "startedAtMs": step2_start,
                    "endedAtMs": step2_end,
                },
            ],
            "videoPath": str(annotated_video_path),
            "rawVideoPath": str(raw_video_path),
            "unityExe": str(unity_exe),
            "projectPath": str(project_path),
        }
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        return 0
    finally:
        if unity_process and unity_process.poll() is None:
            safe_kill_process(unity_process.pid)
        stop_screen_recording(recording_process)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # pragma: no cover - integration path
        print(f"[unity-flow] {error}", file=sys.stderr)
        raise
