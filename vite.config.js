import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        blog: resolve(__dirname, 'blog.html'),
        'blog-post': resolve(__dirname, 'blog-post.html'),
        admin: resolve(__dirname, 'admin.html'),
      }
    }
  }
});
