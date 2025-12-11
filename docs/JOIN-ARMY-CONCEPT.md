# Join Army - Concept Document

## Overview

**BONK Battle** is for everyone. **Join Army** is for communities.

Join Army represents a "world within BONK Battle" - a dedicated layer where organized communities can compete against each other in structured warfare.

---

## The Two Layers of BONK Battle

### Layer 1: BONK Battle (Individual)
- Open to all users
- Anyone can create tokens and battle
- Individual traders compete for glory
- Focus: Personal wins and token creation

### Layer 2: Join Army (Community)
- For organized communities
- Your community vs. my community
- Collective warfare and team victories
- Focus: Group coordination and community pride

---

## What is an Army?

An Army is a community of users who have banded together under a single banner. Each army has:

- **Name**: The identity of the community
- **Icon/Logo**: Visual representation
- **Members**: Soldiers who have joined
- **Battle Record**: Wins and losses in community battles
- **Rank**: Position on the leaderboard

---

## The Three Tabs

### On Fire
Shows armies with the most momentum - measured by **new recruits** joining recently.
- Displays: `+X new today`
- Color: Green for positive growth
- Purpose: Discover trending communities

### Top
Shows the largest armies by **total member count**.
- Displays: Total soldiers
- Purpose: Find established, powerful communities

### Leaderboard
Shows armies ranked by **battle performance** (win/loss record).
- Displays: `W-L` record and win percentage
- Color: Green for >50% win rate, Red for <50%
- Purpose: Find the strongest warriors

---

## Why Join an Army?

1. **Community**: Be part of something bigger
2. **Competition**: Your community vs. rival communities
3. **Glory**: Climb the leaderboard together
4. **Identity**: Represent your tribe in the arena

---

## The Vision

Join Army transforms BONK Battle from an individual experience into a **community warfare platform**:

```
Individual User → Token Battles → Personal Glory
      ↓
Community Member → Army Battles → Collective Victory
```

When you enter the Armies page, you should feel like a **pro player** ready to join an elite squad and dominate the battlefield.

---

## Design Philosophy

Inspired by **OpenSea's Trending Collections**:
- Clean list layout (not grid)
- Quick-scan statistics
- Clear visual hierarchy
- Dark gaming aesthetic (#101011 background)
- Premium card feel (#151516 containers)

The goal: Make users feel like they're entering a competitive arena where only the strongest communities survive.

---

## Call to Action

> "Choose your side. Build your army. Crush your enemies."

Every user who visits the Armies page should feel the urge to either:
1. **Join** an existing powerful army
2. **Create** their own army and recruit soldiers

---

## Technical Implementation

- **Page**: `/armies`
- **API**: `useArmies(tab)` hook fetches army data
- **Tabs**: `top`, `onfire`, `leaderboard`
- **Real-time**: Member counts and battle records update live
- **Links**: Each army card links to `/armies/[id]` for full details
