<?php

namespace App\Services;

/**
 * Best-effort conversion of a Lightroom .xmp preset into a CSS filter() string.
 *
 * CSS filter() only supports coarse global adjustments (brightness, contrast,
 * saturation, grayscale). Tone curves, per-channel HSL, split toning, white
 * balance, sharpening etc. from the preset are read but cannot be reproduced
 * in a browser and are intentionally ignored.
 */
class XmpFilterParser
{
    public static function toCss(string $xmpContent): string
    {
        $attrs = self::extractAttributes($xmpContent);

        $grayscale = isset($attrs['ConvertToGrayscale'])
            && strtolower($attrs['ConvertToGrayscale']) === 'true';

        $exposure = self::firstFloat($attrs, ['Exposure2012', 'Exposure']);
        $contrastRaw = self::firstFloat($attrs, ['Contrast2012', 'Contrast']);
        $saturationRaw = self::firstFloat($attrs, ['Saturation', 'Vibrance']);

        // Many film-emulation presets barely touch the plain Contrast/Saturation sliders —
        // their look comes from lifting shadows + pulling down highlights/whites (a "faded"
        // tonal range) and from per-hue desaturation in the HSL panel. Fold both into the
        // coarse contrast/saturate() values so those presets still read as visually distinct.
        $highlights = self::firstFloat($attrs, ['Highlights2012']);
        $shadows = self::firstFloat($attrs, ['Shadows2012']);
        $whites = self::firstFloat($attrs, ['Whites2012']);
        $blacks = self::firstFloat($attrs, ['Blacks2012']);
        $fade = ($shadows - $highlights + $blacks - $whites) / 4;

        $hslSaturation = self::averageMatching($attrs, '/^SaturationAdjustment/');

        $brightness = self::clamp(1 + $exposure * 0.12, 0.5, 1.8);
        $contrast = self::clamp(1 + ($contrastRaw - $fade) / 100, 0.5, 1.8);
        $saturate = self::clamp(1 + ($saturationRaw + $hslSaturation * 0.4) / 100, 0, 2.5);

        // Camera Calibration's primary hue shifts are the strongest generically-available
        // signal of a preset's warm color bias (e.g. film-emulation "golden" looks push red
        // up and blue down here). Unlike contrast/saturation, sepia() reads clearly even on
        // pale/near-white areas, not just saturated photo content — but it only ever pushes
        // warm, so it's only applied for presets that are actually warm-biased.
        $redHue = self::firstFloat($attrs, ['RedHue']);
        $blueHue = self::firstFloat($attrs, ['BlueHue']);
        $warmBias = ($redHue - $blueHue) / 2;
        $sepia = $warmBias > 0 ? self::clamp($warmBias / 150, 0, 0.35) : 0.0;

        $parts = [];
        if ($grayscale) {
            $parts[] = 'grayscale(1)';
        }
        if (abs($brightness - 1) > 0.01) {
            $parts[] = sprintf('brightness(%.2f)', $brightness);
        }
        if (abs($contrast - 1) > 0.01) {
            $parts[] = sprintf('contrast(%.2f)', $contrast);
        }
        if (! $grayscale && abs($saturate - 1) > 0.01) {
            $parts[] = sprintf('saturate(%.2f)', $saturate);
        }
        if (! $grayscale && $sepia > 0.01) {
            $parts[] = sprintf('sepia(%.2f)', $sepia);
        }

        return implode(' ', $parts);
    }

    /** @return array<string, string> */
    private static function extractAttributes(string $content): array
    {
        preg_match_all('/crs:([A-Za-z0-9]+)="([+-]?[0-9.]+|True|False)"/', $content, $matches, PREG_SET_ORDER);

        $attrs = [];
        foreach ($matches as $match) {
            $attrs[$match[1]] = $match[2];
        }

        return $attrs;
    }

    /** @param array<string, string> $attrs @param string[] $keys */
    private static function firstFloat(array $attrs, array $keys): float
    {
        foreach ($keys as $key) {
            if (isset($attrs[$key])) {
                return (float) $attrs[$key];
            }
        }

        return 0.0;
    }

    private static function clamp(float $value, float $min, float $max): float
    {
        return max($min, min($max, $value));
    }

    /** Averages every attribute value whose key matches $pattern (e.g. all 8 HSL sliders). */
    private static function averageMatching(array $attrs, string $pattern): float
    {
        $values = [];
        foreach ($attrs as $key => $value) {
            if (preg_match($pattern, $key)) {
                $values[] = (float) $value;
            }
        }

        return count($values) > 0 ? array_sum($values) / count($values) : 0.0;
    }
}
