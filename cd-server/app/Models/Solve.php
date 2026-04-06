<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Solve extends Model
{
    protected $fillable = [
        'session_id',
        'time',
        'scramble',
        'penalty',
        'solved_at',
    ];

    protected $casts = [
        'solved_at' => 'datetime',
    ];

    protected $hidden = [
        'session_id',
        'created_at',
        'updated_at',
    ];

    protected $appends = ['date'];

    public function session(): BelongsTo
    {
        return $this->belongsTo(Session::class);
    }

    public function getDateAttribute(): ?string
    {
        return $this->solved_at?->toIso8601String();
    }
}
