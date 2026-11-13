# Dashboard art

Background art for the dashboard (Settings → Dashboard → Dashboard Art).

## How it is organised

One folder per category. Each picture is a pair of files, one for Light and one for Dark:

```
dashboard-art/
  japanese/
    01-light.webp
    01-dark.webp
  bauhaus/
    01-light.webp
    01-dark.webp
  ...
```

## Adding a picture to a category

Drop two more files into that category's folder, using the next number:

```
japanese/02-light.webp
japanese/02-dark.webp
```

Nothing else needs to change; Settings lists it under that category on the next build.
If only one of the two files exists, it is used for both Light and Dark.

## Adding a category

Create a new folder and put a pair of files in it. It appears in Settings under the folder name.
To give it a proper title and description, and to place it in the order, add it to
`ART_CATEGORIES` in `src/pages/dashboard/dashboardArt.ts`.

Current categories: `bauhaus`, `liquid`, `impressionist`, `surreal`, `japanese`, `generative`,
`papercut`, `inkwash`, `popart`, `lineart`.

## Picture rules

- Wide banner, 3:1. About 2400 × 800 px (the current ones are 2000 × 668). `.webp`, `.png`, `.jpg` work.
- Under 500 KB each if possible; every picture is shipped inside the application.
- No text, labels, badges, logos or watermarks in the picture.
- The dashboard fades the bottom of the picture into the page by itself, so it can be full-bleed.

## A user's own picture

Settings → Dashboard Art → My Picture lets a user import one picture. It is not stored here: it is
cut to 3:1, saved on that PC only, and used in both Light and Dark.
