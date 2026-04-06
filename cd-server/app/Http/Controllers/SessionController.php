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

    public function update(Request $request, $id) {
        $session = Session::findOrFail($id);
        if ($session->user_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        $session->update($request->only('name'));
        return response()->json($session);
    }

    public function destroy($id) {
        $session = Session::findOrFail($id);
        if ($session->user_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        $session->delete();
        return response()->json(['message' => 'Session deleted']);
    }

}
