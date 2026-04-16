# Kuzielum — Web Apps Platform

A beautiful Express.js showcase platform for hosting and presenting static web apps and dynamic MongoDB-powered applications from a single codebase.

---

## Architecture

```
kuzielum/
├── server.js                  # Main entry point
├── package.json
├── .env                       # Environment config
├── seed.js                    # Database seeder
│
├── config/
│   └── database.js            # Central MongoDB connection (shared with dynamic apps)
│
├── models/
│   └── App.js                 # App registry schema
│
├── middleware/
│   ├── appLoader.js           # Dynamically mounts static & dynamic apps
│   └── upload.js              # Multer thumbnail uploads
│
├── routes/
│   ├── index.js               # Homepage (serves showcase)
│   └── api.js                 # REST API for managing apps
│
├── views/
│   └── index.ejs              # Showcase homepage template
│
├── public/
│   ├── css/style.css          # Main stylesheet
│   ├── js/main.js             # Client-side rendering
│   ├── images/
│   └── uploads/               # Thumbnail uploads
│
├── apps/
│   ├── static/                # Static web apps (HTML/CSS/JS)
│   │   ├── portfolio-site/
│   │   ├── landing-page/
│   │   └── interactive-quiz/
│   │
│   └── dynamic/               # Dynamic Express sub-apps
│       └── notes-app/
│           └── index.js       # Exports Router, receives shared mongoose
```

---

## Setup

### Prerequisites
- **Node.js** 18+
- **MongoDB** running locally or a MongoDB Atlas URI

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI

# 3. Seed the database with example apps
npm run seed

# 4. Start the server
npm start        # production
npm run dev      # development (auto-reload with nodemon)
```

Visit `http://localhost:3000` to see the showcase.

---

## Adding Apps

### Adding a Static App

1. **Create a folder** in `apps/static/` with your app's files:
   ```
   apps/static/my-cool-site/
   ├── index.html
   ├── style.css
   └── script.js
   ```

2. **Register it** via the API:
   ```bash
   curl -X POST http://localhost:3000/api/apps \
     -H "Content-Type: application/json" \
     -d '{
       "title": "My Cool Site",
       "slug": "my-cool-site",
       "description": "A description of my cool site.",
       "category": "Website",
       "type": "static",
       "tech": ["HTML", "CSS", "JS"],
       "pages": 3,
       "folder": "my-cool-site",
       "pattern": "dots"
     }'
   ```

3. **Restart the server** (static mounts are loaded at boot).

Your app is now live at `/apps/my-cool-site` and appears on the homepage.

### Adding a Dynamic App (with MongoDB)

1. **Create a folder** in `apps/dynamic/` with an entry file:
   ```
   apps/dynamic/my-dynamic-app/
   ├── index.js          # Must export a Router or factory function
   └── public/           # Optional static assets for this app
       └── style.css
   ```

2. **Write the entry file.** There are three supported patterns:

   **Pattern A — Factory function (recommended):**
   ```js
   // Receives the shared mongoose instance
   module.exports = function(mongoose) {
     const express = require('express');
     const router = express.Router();

     // Define your own models in the shared database
     const ItemSchema = new mongoose.Schema({
       name: String,
       done: Boolean
     }, { timestamps: true });

     const Item = mongoose.models.MyApp_Item
       || mongoose.model('MyApp_Item', ItemSchema);

     router.get('/', async (req, res) => {
       const items = await Item.find();
       res.json(items);
     });

     router.post('/', async (req, res) => {
       const item = await Item.create(req.body);
       res.json(item);
     });

     return router;
   };
   ```

   **Pattern B — Plain router (no DB needed):**
   ```js
   const express = require('express');
   const router = express.Router();

   router.get('/', (req, res) => {
     res.send('Hello from my dynamic app!');
   });

   module.exports = router;
   ```

   **Pattern C — Object with async init:**
   ```js
   const express = require('express');
   const router = express.Router();

   let MyModel;

   module.exports = {
     async init(mongoose) {
       // Run async setup, e.g. create indexes
       const schema = new mongoose.Schema({ name: String });
       MyModel = mongoose.model('MyApp_Model', schema);
       await MyModel.createIndexes();
     },
     router
   };
   ```

3. **Register it** via the API:
   ```bash
   curl -X POST http://localhost:3000/api/apps \
     -H "Content-Type: application/json" \
     -d '{
       "title": "My Dynamic App",
       "slug": "my-dynamic-app",
       "description": "A dynamic app with database access.",
       "category": "App",
       "type": "dynamic",
       "tech": ["Express", "MongoDB"],
       "folder": "my-dynamic-app",
       "entryFile": "index.js",
       "usesDatabase": true,
       "pattern": "circles"
     }'
   ```

4. **Restart the server.**

Your app is now live at `/apps/my-dynamic-app`.

---

## REST API

All endpoints are under `/api/`.

| Method   | Endpoint             | Description              |
|----------|----------------------|--------------------------|
| `GET`    | `/api/apps`          | List all active apps     |
| `GET`    | `/api/apps/:slug`    | Get a single app         |
| `POST`   | `/api/apps`          | Register a new app       |
| `PUT`    | `/api/apps/:slug`    | Update an app            |
| `DELETE` | `/api/apps/:slug`    | Delete an app            |
| `GET`    | `/api/categories`    | List all categories      |

### Query Filters
- `GET /api/apps?category=Website` — filter by category
- `GET /api/apps?type=dynamic` — filter by type

### Thumbnail Upload
Send a `multipart/form-data` POST/PUT with a `thumbnail` field:
```bash
curl -X POST http://localhost:3000/api/apps \
  -F "title=My App" \
  -F "slug=my-app" \
  -F "description=An app" \
  -F "type=static" \
  -F "folder=my-app" \
  -F "thumbnail=@./screenshot.png"
```

---

## Central Database

The platform uses a single MongoDB database. Dynamic apps share this database through the mongoose instance passed to their entry function. To avoid collection name collisions, prefix your model names with your app name:

```js
// Good: prefixed model name
mongoose.model('NotesApp_Note', schema);
mongoose.model('TodoApp_Item', schema);

// Bad: generic name that might collide
mongoose.model('Item', schema);
```

---

## Environment Variables

| Variable         | Default                              | Description                     |
|------------------|--------------------------------------|---------------------------------|
| `PORT`           | `3000`                               | Server port                     |
| `NODE_ENV`       | `development`                        | Environment mode                |
| `MONGODB_URI`    | `mongodb://localhost:27017/kuzielum` | MongoDB connection string       |
| `SESSION_SECRET` | (required)                           | Express session secret          |
| `MAX_FILE_SIZE`  | `10485760`                           | Max upload size in bytes (10MB) |

---

## License

MIT
