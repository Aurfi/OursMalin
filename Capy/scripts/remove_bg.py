"""
Utility script to batch process vegetable assets by removing the solid background
color (assumed uniform) and saving transparent PNGs. It is designed to be
run from the project root. The script will load each specified input image,
identify the most common background color (the pixel value of the top-left
corner) and replace all pixels matching that color (within a small tolerance)
with transparency. The resulting image is then cropped to the minimal
bounding box containing non-transparent pixels and saved with the same
filename in the output directory. If the output directory does not exist, it
will be created.

Usage:
    python scripts/remove_bg.py --input assets/veg_carrot.png assets/veg_tomato.png ...
"""

import os
import argparse
from PIL import Image


def remove_background(input_path: str, output_dir: str) -> None:
    """Load an image, remove its solid background color and save it.

    Args:
        input_path: Path to the PNG image to process.
        output_dir: Directory where the processed image will be saved.
    """
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    # Use the pixel in the top-left corner as the background reference
    # Sample a small region in the top-left corner to estimate the background color
    # This helps when the background is a flat color with minor variations.
    sample_region = [img.getpixel((x, y)) for y in range(min(5, height)) for x in range(min(5, width))]
    # Compute average background RGB values
    avg_r = sum([p[0] for p in sample_region]) / len(sample_region)
    avg_g = sum([p[1] for p in sample_region]) / len(sample_region)
    avg_b = sum([p[2] for p in sample_region]) / len(sample_region)
    data = img.getdata()
    new_data = []
    # Tolerance for background removal. Pixels within this distance from the average
    # background color will be made transparent. Increase if backgrounds vary more.
    tolerance = 15
    for pixel in data:
        # Compute absolute difference per channel
        dr = abs(pixel[0] - avg_r)
        dg = abs(pixel[1] - avg_g)
        db = abs(pixel[2] - avg_b)
        if dr <= tolerance and dg <= tolerance and db <= tolerance:
            new_data.append((0, 0, 0, 0))  # make transparent
        else:
            new_data.append(pixel)
    img.putdata(new_data)
    # Crop to bounding box of non-transparent pixels
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    # Prepare output directory
    os.makedirs(output_dir, exist_ok=True)
    filename = os.path.basename(input_path)
    output_path = os.path.join(output_dir, filename)
    img.save(output_path)
    print(f"Processed {input_path} -> {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Remove solid background from images.")
    parser.add_argument("--input", nargs="+", required=True, help="List of input image paths")
    parser.add_argument("--output", default="processed_assets", help="Output directory")
    args = parser.parse_args()
    for input_path in args.input:
        remove_background(input_path, args.output)


if __name__ == "__main__":
    main()