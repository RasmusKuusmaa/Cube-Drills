<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Session extends Model
{
    protected $table = 'practice_sessions';

    protected $fillable = [
        'user_id',
        'name',
        'cube',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function solves(): HasMany
    {
        return $this->hasMany(Solve::class)->orderByDesc('solved_at');
    }
}
