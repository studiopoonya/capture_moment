<?php

namespace Database\Seeders;

use App\Models\Frame;
use Illuminate\Database\Seeder;

class FrameSeeder extends Seeder
{
    public function run(): void
    {
        $frames = [
            [
                'name' => 'Minty Fresh Strip',
                'image' => asset('images/frames/frame-mint.jpg'),
                'active' => true,
                'rounded' => false,
                'slots' => [
                    ['id' => 's1', 'x' => 10, 'y' => 6, 'w' => 80, 'h' => 27.333],
                    ['id' => 's2', 'x' => 10, 'y' => 36.333, 'w' => 80, 'h' => 27.333],
                    ['id' => 's3', 'x' => 10, 'y' => 66.667, 'w' => 80, 'h' => 27.333],
                ],
            ],
            [
                'name' => 'Pink Bows',
                'image' => asset('images/frames/frame-pink.jpg'),
                'active' => true,
                'rounded' => false,
                'slots' => [
                    ['id' => 's1', 'x' => 12, 'y' => 5, 'w' => 76, 'h' => 20.625],
                    ['id' => 's2', 'x' => 12, 'y' => 28.125, 'w' => 76, 'h' => 20.625],
                    ['id' => 's3', 'x' => 12, 'y' => 51.25, 'w' => 76, 'h' => 20.625],
                    ['id' => 's4', 'x' => 12, 'y' => 74.375, 'w' => 76, 'h' => 20.625],
                ],
            ],
            [
                'name' => 'Sunny Daisy',
                'image' => asset('images/frames/frame-sun.jpg'),
                'active' => true,
                'rounded' => false,
                'slots' => [
                    ['id' => 's1', 'x' => 12, 'y' => 8, 'w' => 76, 'h' => 40],
                    ['id' => 's2', 'x' => 12, 'y' => 52, 'w' => 76, 'h' => 40],
                ],
            ],
            [
                'name' => 'Cloud Nine',
                'image' => asset('images/frames/frame-blue.jpg'),
                'active' => true,
                'rounded' => false,
                'slots' => [
                    ['id' => 's1', 'x' => 15, 'y' => 18, 'w' => 70, 'h' => 64],
                ],
            ],
            [
                'name' => 'Lilac Dream (draft)',
                'image' => asset('images/frames/frame-pink.jpg'),
                'active' => false,
                'rounded' => false,
                'slots' => [
                    ['id' => 's1', 'x' => 9, 'y' => 7, 'w' => 82, 'h' => 26.667],
                    ['id' => 's2', 'x' => 9, 'y' => 36.667, 'w' => 82, 'h' => 26.667],
                    ['id' => 's3', 'x' => 9, 'y' => 66.333, 'w' => 82, 'h' => 26.667],
                ],
            ],
        ];

        foreach ($frames as $frame) {
            Frame::create($frame);
        }
    }
}
