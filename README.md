# DhakaFlix

A userscript that connects IMDb and Letterboxd with DhakaFlix.

It detects the movie or series title, determines the appropriate DhakaFlix category, opens the corresponding DhakaFlix server, and automatically searches for the title.

## Install

### One Click Install

<a href="https://raw.githubusercontent.com/cthboss001/DhakaFlix/main/dhakaflix.user.js">
  <img src="https://img.shields.io/badge/Install%20DhakaFlix%20Userscript-FF6600?style=for-the-badge&logo=tampermonkey&logoColor=white" alt="Install DhakaFlix Userscript">
</a>

> Tampermonkey or another userscript manager must be installed.

### Manual Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) or another userscript manager.
2. Open the `dhakaflix.user.js` file.
3. Click **Raw**.
4. Tampermonkey should detect the userscript automatically.
5. Click **Install**.

## How It Works

Open a movie or series page on:

- IMDb
- Letterboxd

The script adds a **DhakaFlix** button.

Clicking the button:

1. Detects the title.
2. Determines the appropriate category.
3. Opens the corresponding DhakaFlix server.
4. Opens the DhakaFlix search interface.
5. Enters the movie title.
6. Triggers the native DhakaFlix search.
7. Displays the matching results.

## Supported Sources

### IMDb

Movie and series pages from IMDb are supported.

### Letterboxd

Movie pages from Letterboxd are supported.

## DhakaFlix Categories

The script currently supports:

| Category | Description |
|---|---|
| English Movies | English language movies |
| Hindi Movies | Hindi movies |
| South Indian Movies | South Indian movies, including Hindi dubbed content |
| Foreign Language Movies | Non English and non Indian foreign movies |
| Kolkata Bangla Movies | Bengali movies from India |
| TV & Web Series | TV and web series |
| Korean TV & Web Series | Korean TV and web series |
| Animation Movies | Animated movies |

## Example

On an IMDb or Letterboxd movie page:

```text
Movie
  ↓
DhakaFlix button
  ↓
Category detection
  ↓
DhakaFlix category
  ↓
Automatic search
  ↓
Movie results
