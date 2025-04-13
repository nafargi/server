import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = 5000;
const PEXELS_API_KEY = 'RKF5sutZLgxi75yhX8tWcMDchL1Z1IOI5npI4HBHLpd9jK2fCUgChto2'; // Get from https://www.pexels.com/api/

app.use(cors());
const deezerBaseUrl = 'https://api.deezer.com';



// Array to store multiple music-related queries
const musicQueries = [
  'music concert',
  'musician',
  'music festival',
  'dj',
  'vinyl records',
  'guitar',
  'piano',
  'music studio',
  'headphones',
  'live music'
];

let currentImageIndex = 0;

async function fetchRandomMusicImage() {
  try {
    // Rotate through different music queries
    const query = musicQueries[currentImageIndex % musicQueries.length];
    currentImageIndex++;
    
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`, {
      headers: {
        Authorization: PEXELS_API_KEY
      }
    });
    
    const data = await response.json();
    if (data.photos && data.photos.length > 0) {
      // Select a random image from the 10 results
      const randomIndex = Math.floor(Math.random() * data.photos.length);
      return {
        url: data.photos[randomIndex].src.large2x,
        photographer: data.photos[randomIndex].photographer,
        alt: data.photos[randomIndex].alt || `Music image: ${query}`
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

// Endpoint to get current music image
app.get('/api/music-image', async (req, res) => {
  try {
    const imageData = await fetchRandomMusicImage();
    if (imageData) {
      res.json(imageData);
    } else {
      res.status(500).json({ error: 'Failed to fetch music image' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Background job to fetch new image every 10 minutes
setInterval(async () => {
  console.log('Fetching new music image...');
  await fetchRandomMusicImage();
}, 10 * 60 * 100); // 10 minutes

app.get('/deezer-chart', async (req, res) => {
  try {
    const response = await fetch(`${deezerBaseUrl}/chart/0/artists`);
    
    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data); 
  } catch (error) {
    console.error("Error fetching Deezer data:", error); 
    res.status(500).json({ error: 'Failed to fetch data from Deezer API' }); 
  }
});


app.get('/deezer-top-artists', async (req, res) => {
  try {
    const response = await fetch(`${deezerBaseUrl}/artist/27/top`);

    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data); 
  } catch (error) {
    console.error("Error fetching Deezer data:", error); 
    res.status(500).json({ error: 'Failed to fetch data from Deezer API' }); 
  }
});



app.get('/search-artist', async (req, res) => {
  const artistName = req.query.q || 'eminem'; 
  try {
      const response = await fetch(`${deezerBaseUrl}/search?q=${artistName}`);
      const data = await response.json();
      res.json(data); 
  } catch (error) {
      res.status(500).json({ error: 'Error fetching data from Deezer' });
  }
});


app.get('/fetch-playlists', async (req, res) => {
  try {
    // Example playlist IDs you want to fetch
    const playlistIds = ['908622995', '908622981', '987654321']; // Replace with real playlist IDs
    const playlists = [];

    for (const id of playlistIds) {
      const playlistUrl = `https://api.deezer.com/playlist/${id}`;
      const response = await fetch(playlistUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data for playlist ID: ${id}`);
      }

      const data = await response.json();
      playlists.push(data);
    }

    res.json(playlists); // Send the list of playlists to the client
  } catch (error) {
    console.error('Error fetching playlists:', error.message);
    res.status(500).json({ error: 'Unable to fetch playlist data' });
  }
});


// Search endpoint to fetch data from Deezer API based on the search query
// Search endpoint to fetch data from Deezer API based on the search query
app.get('/api/search/track', async (req, res) => {
  const query = req.query.q;
  try {
    const response = await fetch(`https://api.deezer.com/search/track?q=${query}`);
    const data = await response.json();
    res.json(data); // Return the data to the client
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

//fetching tracks inside playlist
app.get('/api/playlist-tracks', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Playlist ID is required' });
    }

    const fetch = await import('node-fetch');
    const response = await fetch.default(`https://api.deezer.com/playlist/${id}/tracks`);
    
    if (!response.ok) {
      throw new Error(`Error fetching playlist tracks: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Format the response to match our frontend needs
    const formattedTracks = {
      tracks: data.data.map(track => ({
        id: track.id,
        title: track.title,
        duration: track.duration,
        artist: {
          id: track.artist.id,
          name: track.artist.name,
        },
        album: {
          id: track.album.id,
          title: track.album.title,
          cover_small: track.album.cover_small,
          cover_medium: track.album.cover_medium,
        },
        preview: track.preview
      }))
    };

    res.json(formattedTracks);
  } catch (error) {
    console.error('Error fetching playlist tracks:', error.message);
    res.status(500).json({ error: 'Failed to fetch playlist tracks' });
  }
});

// Similarly, you can add other routes for albums, artists, playlists, etc.
app.get('/api/search/album', async (req, res) => {
  const query = req.query.q;
  try {
    const response = await fetch(`https://api.deezer.com/search/album?q=${query}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.get('/api/search/playlist', async (req, res) => {
  const query = req.query.q;
  try {
    const response = await fetch(`https://api.deezer.com/search/playlist?q=${query}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
app.get('/api/search/user', async (req, res) => {
  const query = req.query.q;
  try {
    const response = await fetch(`https://api.deezer.com/search/user?q=${query}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
app.get('/api/search/artist', async (req, res) => {
  const query = req.query.q;
  try {
    const response = await fetch(`https://api.deezer.com/search/artist?q=${query}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
app.get('/api/album/:id', async (req, res) => {
  const albumId = req.params.id;
  try {
    const response = await fetch(`https://api.deezer.com/album/${albumId}`);
    const data = await response.json();
    res.json(data); // Send back tracks for the album
  } catch (error) {
    console.error('Error fetching album tracks:', error);
    res.status(500).json({ error: 'Failed to fetch album tracks' });
  }
});

app.get('/fetch-chart', async (req, res) => {
  try {
    const chartUrl = 'https://api.deezer.com/artist/27/playlists';
    const response = await fetch(chartUrl);

    if (!response.ok) {
      throw new Error('Failed to fetch chart data');
    }

    const data = await response.json();
    res.json(data); // Send chart data to the client
  } catch (error) {
    console.error('Error fetching chart data:', error.message);
    res.status(500).json({ error: 'Unable to fetch chart data' });
  }
});

// Route to fetch albums for a given artist
app.get("/api/artist/:artistId/albums", async (req, res) => {
  const { artistId } = req.params;

  try {
    const response = await fetch(`https://api.deezer.com/artist/${artistId}/albums`);
    const data = await response.json();

    if (data && data.data) {
      // Filter and sort the albums by release date (recent first)
      const sortedAlbums = data.data.sort(
        (a, b) => new Date(b.release_date) - new Date(a.release_date)
      );

      res.json({
        success: true,
        albums: sortedAlbums,
      });
    } else {
      res.status(404).json({ success: false, message: "No albums found" });
    }
  } catch (error) {
    console.error("Error fetching albums:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
// Route to fetch Deezer chart data
app.get('/api/chart', async (req, res) => {
  try {
    const fetch = await import('node-fetch'); // Use dynamic import for `fetch`
    const response = await fetch.default('https://api.deezer.com/chart'); // Fetch Deezer API
    if (!response.ok) {
      throw new Error(`Error fetching Deezer chart: ${response.statusText}`);
    }
    const data = await response.json();
    res.json(data); // Send Deezer's response to the client
  } catch (error) {
    console.error('Error fetching Deezer chart:', error.message);
    res.status(500).json({ error: 'Failed to fetch Deezer chart data' });
  }
});

app.get('/api/editorial', async (req, res) => {
  try {
    const response = await fetch('https://api.deezer.com/editorial');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch editorial data' });
  }
});
// Proxy endpoint for genre-specific charts
app.get('/api/chart/:genreId', async (req, res) => {
  try {
    const { genreId } = req.params;
    const response = await fetch(`https://api.deezer.com/chart/${genreId}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch genre chart data' });
  }
});
// Route to fetch album tracks
app.get('/api/fetchTracks/album/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const response = await fetch(`https://api.deezer.com/album/${id}`);
    const data = await response.json();

    if (data && data.tracks && data.tracks.data) {
      res.json(data.tracks.data); // Send the tracks data back to the client
    } else {
      res.status(404).json({ message: 'Tracks not found for this album' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching album tracks', error: error.message });
  }
});

// Route to fetch playlist tracks
app.get('/api/fetchTracks/playlist/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const response = await fetch(`https://api.deezer.com/playlist/${id}`);
    const data = await response.json();

    if (data && data.tracks && data.tracks.data) {
      res.json(data.tracks.data); // Send the tracks data back to the client
    } else {
      res.status(404).json({ message: 'Tracks not found for this playlist' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching playlist tracks', error: error.message });
  }
});



// Fetch artist's albums

app.get('/api/artist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await fetch(`https://api.deezer.com/artist/${id}`);
    
    // Check if the response is not HTML (we expect JSON)
    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Expected JSON, but got something else');
    }

    if (!response.ok) {
      throw new Error(`Error fetching ARTIST for ${id}: ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`Error fetching ARTIST for ${id}:`, error.message);
    res.status(500).json({ error: `Error fetching ARTIST for ${id}` });
  }
});

app.get('/api/artist/:id/albums', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await fetch(`https://api.deezer.com/artist/${id}/albums`);
    
    // Check if the response is not HTML (we expect JSON)
    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Expected JSON, but got something else');
    }

    if (!response.ok) {
      throw new Error(`Error fetching related album for ${id}: ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`Error fetching album for ${id}:`, error.message);
    res.status(500).json({ error: `Failed to fetch album for ${id}` });
  }
});

app.get('/api/artist/:id/playlists', async (req, res) => {
  try {
    const { id } = req.params;
    let allPlaylists = [];
    let nextUrl = `https://api.deezer.com/artist/${id}/playlists`;

    while (nextUrl) {
      const response = await fetch(nextUrl);
      
      const contentType = response.headers.get('Content-Type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Expected JSON, but got something else');
      }

      if (!response.ok) {
        throw new Error(`Error fetching playlists for ${id}: ${response.statusText}`);
      }

      const data = await response.json();
      allPlaylists = allPlaylists.concat(data.data); // Append new playlists

      // Check if there is another page
      nextUrl = data.next || null;
    }

    res.json({ data: allPlaylists });
  } catch (error) {
    console.error(`Error fetching playlists for ${id}:`, error.message);
    res.status(500).json({ error: `Failed to fetch playlists for ${id}` });
  }
});

// Fetch related artists
app.get('/api/artist/:id/related', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await fetch(`https://api.deezer.com/artist/${id}/related`);
    
    // Check if the response is not HTML (we expect JSON)
    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Expected JSON, but got something else');
    }

    if (!response.ok) {
      throw new Error(`Error fetching related artists for ${id}: ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`Error fetching related artists for ${id}:`, error.message);
    res.status(500).json({ error: `Failed to fetch related artists for ${id}` });
  }
});


// Fetch top tracks of the artist
app.get('/api/artist/:id/top', async (req, res) => {
  try {
    const { id } = req.params;
    let allTopTracks = [];
    let nextUrl = `https://api.deezer.com/artist/${id}/top?limit=50`; // Request more per page

    while (nextUrl) {
      const response = await fetch(nextUrl);
      
      if (!response.ok) {
        throw new Error(`Error fetching top tracks for artist ${id}: ${response.statusText}`);
      }

      const data = await response.json();
      allTopTracks = allTopTracks.concat(data.data); // Append new tracks

      // Check if there is another page
      nextUrl = data.next || null;
    }

    res.json({ data: allTopTracks });
  } catch (error) {
    console.error(`Error fetching top tracks for artist ${id}:`, error.message);
    res.status(500).json({ error: `Failed to fetch top tracks for artist ${id}` });
  }
});


// Fetch radio of the artist
app.get('/api/artist/:id/radio', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await fetch(`https://api.deezer.com/artist/${id}/radio`);
    if (!response.ok) {
      throw new Error(`Error fetching radio for artist ${id}: ${response.statusText}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`Error fetching radio for artist ${id}:`, error.message);
    res.status(500).json({ error: `Failed to fetch radio for artist ${id}` });
  }
});
//fetch album tracks for artist page
app.get('/api/fetchAlbumTracks/:albumId', async (req, res) => {
  const albumId = req.params.albumId;
  try {
    const response = await fetch(`https://api.deezer.com/album/${albumId}/tracks`);
    const data = await response.json();
    res.json(data); // Return the data to the client
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch album tracks' });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  fetchRandomMusicImage();
});

