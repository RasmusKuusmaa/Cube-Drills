<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Session;
use App\Models\Solve;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->createTestData();
    }

    private function createTestData()
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@test',
            'password' => Hash::make('qwerty'),
        ]);

        $cubeConfigs = [
            ['name' => '3x3 Practice', 'cube' => 'undefined', 'initial_time' => 30000, 'final_time' => 10000, 'scramble_length' => 20],
            ['name' => '2x2 Practice', 'cube' => 'undefined', 'initial_time' => 5000, 'final_time' => 2000, 'scramble_length' => 10],
            ['name' => '5x5 Practice', 'cube' => 'undefined', 'initial_time' => 120000, 'final_time' => 60000, 'scramble_length' => 60],
        ];

        foreach ($cubeConfigs as $config) {
            $session = Session::create([
                'user_id' => $user->id,
                'name' => $config['name'],
                'cube' => $config['cube'],
            ]);

            $this->createSolvesForSession($session, $config);
        }
    }

    private function createSolvesForSession(Session $session, array $config)
    {
        $numSolves = 1000;
        $solves = [];

        for ($i = 0; $i < $numSolves; $i++) {
            $daysAgo = rand(0, 730);
            $hoursAgo = rand(0, 23);
            $minutesAgo = rand(0, 59);
            $solvedAt = now()->subDays($daysAgo)->subHours($hoursAgo)->subMinutes($minutesAgo);
            $solves[] = [
                'solved_at' => $solvedAt,
                'index' => $i,
            ];
        }

        usort($solves, fn($a, $b) => $a['solved_at']->gt($b['solved_at']) ? 1 : -1);

        $moves = ['R', 'L', 'U', 'D', 'F', 'B'];
        $modifiers = ['', "'", '2'];

        foreach ($solves as $index => $solve) {
            $progress = $index / ($numSolves - 1);
            $baseTime = $config['initial_time'] - ($config['initial_time'] - $config['final_time']) * $progress;
            $variation = $baseTime * 0.2; 
            $time = $baseTime + rand(-$variation, $variation);
            $time = max(1000, (int)$time); 

            $scramble = '';
            for ($j = 0; $j < $config['scramble_length']; $j++) {
                $move = $moves[array_rand($moves)] . $modifiers[array_rand($modifiers)];
                $scramble .= $move . ' ';
            }
            $scramble = trim($scramble);

            Solve::create([
                'session_id' => $session->id,
                'time' => $time,
                'scramble' => $scramble,
                'penalty' => 'OK',
                'solved_at' => $solve['solved_at'],
            ]);
        }
    }
}
