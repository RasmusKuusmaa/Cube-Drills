<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\SolveController;

Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);


Route::middleware('auth:api')->group(function () {
    Route::get('me', [AuthController::class, 'me']);

    Route::apiResource('sessions', SessionController::class)->only(['index', 'store']);
    Route::put('sessions/{session}', [SessionController::class, 'update']);
    Route::delete('sessions/{session}', [SessionController::class, 'destroy']);
    Route::post('sessions/{session}/solves', [SolveController::class, 'store']);
});