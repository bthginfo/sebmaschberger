"""Pack locally rendered PNG frames for the KFR1 canvas player. Requires Pillow."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import json
from pathlib import Path
import re
import struct

from PIL import Image, ImageOps


def dimensions(value):
    if not re.fullmatch(r"[0-9]{2,4}x[0-9]{2,4}", value):
        raise argparse.ArgumentTypeError("Expected WIDTHxHEIGHT, for example 1200x492.")
    width, height = map(int, value.split("x"))
    if not 64 <= width <= 2400 or not 64 <= height <= 2400:
        raise argparse.ArgumentTypeError("Both dimensions must be between 64 and 2400.")
    return width, height


def frame_paths(sources):
    frames = {}
    for folder in sources:
        for file in folder.glob("*.png"):
            if not file.stem.isascii() or not file.stem.isdigit():
                continue
            index = int(file.stem)
            if index in frames:
                raise ValueError(f"Frame {index} occurs twice.")
            frames[index] = file
    if not frames or sorted(frames) != list(range(len(frames))):
        raise ValueError("Expected an uninterrupted sequence of numbered PNGs starting at 0000.png.")
    return [frames[index] for index in range(len(frames))]


def encode_frame(file, size, center, alpha, quality):
    with Image.open(file) as image:
        image = image.convert("RGBA" if alpha else "RGB")
        if image.size != size:
            image = ImageOps.fit(image, size, Image.Resampling.LANCZOS, centering=(center, .5))
        stream = BytesIO()
        image.save(stream, format="WEBP", quality=quality, method=3)
        return stream.getvalue()


def encode_variant(name, frames, size, center, args):
    for first in range(0, len(frames), args.chunk):
        payloads = []
        for index in range(first, min(first + args.chunk, len(frames))):
            image = encode_frame(frames[index], size, center, args.alpha, args.quality)
            if index == args.start:
                (args.out / f"{name}.webp").write_bytes(image)
            if index == len(frames) - 1:
                (args.out / f"{name}-last.webp").write_bytes(image)
            payloads.append(image)
        number = first // args.chunk
        header = b"KFR1" + struct.pack("<I", len(payloads))
        header += struct.pack("<" + "I" * len(payloads), *(len(image) for image in payloads))
        target = args.out / f"{name}-{number:02}.bin"
        temporary = target.with_suffix(".tmp")
        temporary.write_bytes(header + b"".join(payloads))
        temporary.replace(target)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, nargs="+", required=True)
    parser.add_argument("--mobile-source", type=Path, nargs="+")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--base", required=True, help="Public, same-origin directory, with no trailing slash.")
    parser.add_argument("--wide", type=dimensions, default=(1200, 492))
    parser.add_argument("--mobile", type=dimensions, default=(600, 492))
    parser.add_argument("--mobile-center", type=float, default=.5, help="0 crops toward the left, 1 toward the right.")
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--source-fps", type=int, help="Optional render rate when exporting a lighter rendition.")
    parser.add_argument("--chunk", type=int, default=12)
    parser.add_argument("--quality", type=int, default=86)
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--cuts", type=int, nargs="*", default=[])
    parser.add_argument("--alpha", action="store_true")
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()

    if not re.fullmatch(r"/(?:[a-z0-9_-]+/)*[a-z0-9_-]+", args.base):
        parser.error("The base must be a same-origin absolute path, with lower-case URL segments.")
    if not 12 <= args.fps <= 60 or not 1 <= args.chunk <= 24 or not 0 <= args.mobile_center <= 1 or not 40 <= args.quality <= 96:
        parser.error("Use 12–60 FPS, 1–24 frames per bundle, quality 40–96 and a mobile crop from 0 to 1.")
    wide = frame_paths(args.source)
    mobile = frame_paths(args.mobile_source) if args.mobile_source else wide
    if len(wide) != len(mobile):
        parser.error("Both renditions must have the same source frame count.")
    if args.source_fps:
        if not args.fps <= args.source_fps <= 120:
            parser.error("The source frame rate must be at least the export frame rate and at most 120.")
        indices = [round(i * args.source_fps / args.fps)
                   for i in range((len(wide) - 1) * args.fps // args.source_fps + 1)]
        if indices[-1] != len(wide) - 1:
            indices.append(len(wide) - 1)
        wide, mobile = [wide[index] for index in indices], [mobile[index] for index in indices]
    if not 0 <= args.start < len(wide):
        parser.error("Both takes must have the same frame count and a valid starting frame.")
    if sorted(set(args.cuts)) != args.cuts or any(not 0 < frame < len(wide) for frame in args.cuts):
        parser.error("Text cues must be unique ascending frame numbers within the take.")

    args.out.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        tasks = (
            pool.submit(encode_variant, "wide", wide, args.wide, .5, args),
            pool.submit(encode_variant, "mobile", mobile, args.mobile, args.mobile_center, args),
        )
        for task in tasks:
            task.result()
    manifest = {
        "base": args.base, "frames": len(wide), "fps": args.fps, "chunk": args.chunk,
        "start": args.start, "cuts": args.cuts, "alpha": args.alpha, "once": args.once,
        "wide": dict(zip(("width", "height"), args.wide)),
        "mobile": dict(zip(("width", "height"), args.mobile)),
    }
    (args.out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"{args.base}: {len(wide)} frames at {args.fps} fps, two renditions.", flush=True)


if __name__ == "__main__":
    main()
