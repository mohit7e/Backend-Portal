# Project Management Portal — Backend

Node.js API for a developer project showcase: add, edit, delete projects and store fields (title, developer name, description, timeline, images, etc.). Data is stored in a JSON file (no native build); images in `uploads/`.

## Setup

```bash
npm install
```

Optional: create `.env` and set `PORT` if you want to override the default port.

## Run

```bash
npm start
# or with auto-reload:
npm run dev
```

Server runs at `http://localhost:3000` (or your `PORT`).

## API

Base path: **`/api/projects`**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects (id, title, developer_name, created_at) for the projects page |
| GET | `/api/projects/:id` | Get one project (full details) for the project detail page |
| POST | `/api/projects` | Create a project (multipart form + images) |
| PUT | `/api/projects/:id` | Update a project (JSON or multipart with optional new images) |
| DELETE | `/api/projects/:id` | Delete a project |

### Project fields

- **title** (required) — Shown in the list; clicking it can link to `/projects/:id`
- **developer_name** — Your name
- **description** — Project description
- **timeline** — e.g. "Jan 2024 – Mar 2024"
- **link** — Live or repo URL
- **tech_stack** — e.g. "React, Node, PostgreSQL"
- **images** — Stored when you upload files; returned as URLs like `/uploads/filename.jpg`

### Create project (POST)

Send **multipart/form-data**:

- `title`, `developer_name`, `description`, `timeline`, `link`, `tech_stack` (text fields)
- `images` — one or more image files (up to 20, jpeg/png/gif/webp, max 5MB each)

Example with `curl`:

```bash
curl -X POST http://localhost:3000/api/projects \
  -F "title=My App" \
  -F "developer_name=Jane Doe" \
  -F "description=A cool app" \
  -F "timeline=2024" \
  -F "link=https://github.com/me/app" \
  -F "tech_stack=React, Node" \
  -F "images=@/path/to/screenshot.png"
```

### Update project (PUT)

- **JSON** (`Content-Type: application/json`): send any subset of fields including `images` (array of URL strings). Omitted fields keep current values.
- **Multipart**: send text fields and/or new `images`. To keep existing images, send `keep_images` as a JSON string of current image URLs; new files are appended.

### List and detail

- **List**: `GET /api/projects` → array of `{ id, title, developer_name, created_at }`. Use this to show projects by title; each title can link to the project page.
- **Detail**: `GET /api/projects/:id` → full project (all fields + `images` array). Use this on the project page when the user opens a project by id.

## Data and files

- **Database**: JSON file at `data/projects.json` (created on first run). No native modules required.
- **Images**: Stored under `uploads/` and served at `/uploads/...`. Add `uploads/` to `.gitignore` if you don’t want to commit uploads.

## Frontend usage

1. **Projects page**: Call `GET /api/projects`, render each item by `title` (and optionally developer name, date). Link each row to your project detail route, e.g. `/projects/123` using `id`.
2. **Project detail page**: For route `/projects/:id`, call `GET /api/projects/:id` and show title, developer name, description, timeline, link, tech stack, and all `images`.
3. **Add project**: Form with the fields above + file input for images; submit as multipart to `POST /api/projects`.
4. **Edit project**: Prefill form from `GET /api/projects/:id`; submit changes (and optional new images) with `PUT /api/projects/:id`.
5. **Delete**: Call `DELETE /api/projects/:id`, then redirect to the projects list.
