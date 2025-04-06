import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);


const app = express();
const PORT = 5000;


// Improved CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-production-domain.com' 
    : 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Better rate limiting
const rateLimit = (windowMs, max) => {
  const hits = new Map();
  const interval = setInterval(() => hits.clear(), windowMs);
  
  // Clean up interval when server stops
  interval.unref();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const hitCount = hits.get(ip) || 0;
    
    if (hitCount >= max) {
      res.setHeader('Retry-After', Math.ceil(windowMs/1000));
      return res.status(429).json({ 
        error: "Too many requests",
        retryAfter: Math.ceil(windowMs/1000)
      });
    }
    
    hits.set(ip, hitCount + 1);
    next();
  };
};

// Apply rate limiting only to API routes
app.use('/api', rateLimit(60 * 1000, 60)); // 60 requests per minute
// const require = createRequire(import.meta.url);
// const { AudioContext } = NodeWebAudioApi;
const deezerBaseUrl = 'https://api.deezer.com';

// Audio analysis endpoint
app.get("/api/analyze-audio", async (req, res) => {
  try {
    const audioUrl = req.query.url;
    
    if (!audioUrl || !isValidUrl(audioUrl)) {
      return res.status(400).json({ error: "Invalid audio URL" });
    }

    // Fetch audio stream with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const audioResponse = await fetch(audioUrl, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!audioResponse.ok) {
      throw new Error(`Audio fetch failed with status ${audioResponse.status}`);
    }

    // Get audio data as buffer
    const audioBuffer = await audioResponse.arrayBuffer();
    
    // Simple audio analysis
    const analysis = analyzeAudioBuffer(audioBuffer);
    
    res.json({
      success: true,
      ...analysis
    });

  } catch (error) {
    console.error("Audio analysis error:", error);
    res.status(500).json({ 
      error: "Audio analysis failed",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Simple audio analysis that works with raw buffer data
function analyzeAudioBuffer(buffer) {
  // Convert buffer to Uint8Array
  const data = new Uint8Array(buffer);
  const frequencyBands = 32;
  const results = new Array(frequencyBands).fill(0);
  
  // Simple energy calculation per band
  const samplesPerBand = Math.floor(data.length / frequencyBands);
  
  for (let band = 0; band < frequencyBands; band++) {
    let energy = 0;
    const start = band * samplesPerBand;
    const end = Math.min(start + samplesPerBand, data.length);
    
    for (let i = start; i < end; i++) {
      // Convert unsigned to signed (-128 to 127)
      const sample = (data[i] - 128) / 128;
      energy += Math.abs(sample);
    }
    
    results[band] = energy / (end - start);
  }
  
  // Normalize results
  const max = Math.max(...results);
  return {
    frequencies: max > 0 ? results.map(val => val / max) : results,
    sampleRate: 44100, // Assuming standard sample rate
    duration: data.length / 44100 // Approximate duration
  };
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

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
});


