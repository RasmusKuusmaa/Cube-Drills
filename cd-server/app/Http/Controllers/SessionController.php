<?php

namespace App\Http\Controllers;

use App\Models\Session;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function index()
    {
        $sessions = auth()->user()
            ->sessions()
            ->with('solves')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($sessions);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'cube' => 'nullable|string',
        ]);

        $session = auth()->user()->sessions()->create($data);

        return response()->json($session->load('solves'), 201);
    }

}
