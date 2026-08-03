import { defineConfig } from 'vite';
import ytSearch from 'yt-search';

export default defineConfig({
  plugins: [
    {
      name: 'youtube-search-api',
      configureServer(server) {
        server.middlewares.use('/api/search', async (req, res) => {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const query = url.searchParams.get('q');
          if (!query) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing query' }));
            return;
          }
          try {
            const r = await ytSearch(query);
            // Filter to only get videos and take top 4
            const videos = r.videos.slice(0, 4);
            const topResults = videos.map(v => ({
              title: v.title,
              id: v.videoId,
              author: v.author.name
            }));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(topResults));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.toString() }));
          }
        });

        server.middlewares.use('/api/info', async (req, res, next) => {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const id = url.searchParams.get('id');
          if (!id) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing id' }));
            return;
          }
          try {
            const video = await ytSearch({ videoId: id });
            if (!video) throw new Error("Video not found");
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ title: video.title, author: video.author.name }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.toString() }));
          }
        });
      }
    }
  ]
});
