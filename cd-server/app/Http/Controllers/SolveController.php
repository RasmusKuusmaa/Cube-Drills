<?php

namespace App\Http\Controllers;

use App\Models\Session;
use Illuminate\Http\Request;

class SolveController extends Controller
{
    public function store(Request $request, Session $session)
    {
        $this->authorizeSession($session);

        $data = $request->validate([
            'time' => 'required|integer|min:0',
            'scramble' => 'required|string',
            'penalty' => 'nullable|in:OK,+2,DNF',
        ]);

        $solve = $session->solves()->create([
            'time' => $data['time'],
            'scramble' => $data['scramble'],
            'penalty' => $data['penalty'] ?? 'OK',
            'solved_at' => now(),
        ]);

        return response()->json($solve, 201);
    }

    protected function authorizeSession(Session $session)
    {
        abort_if($session->user_id !== auth()->id(), 403);
    }
}
