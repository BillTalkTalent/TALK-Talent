# TALK Forum Intro Bumper (30s)

`talk-forum-bumper.mp4` is a 1920×1080, 30 fps, 30-second silent intro for the TALK Community Discussion Forums.

**Brand.** Taken from the TALK roundtable deck (Oct 1): deep navy `#0F1F35` field, layered navy circles top-right, coral `#E8503A`, ice blue `#CADCFC`, periwinkle `#8FA6E8`, the TALK wordmark, and Calibri. Calibri is rendered here with Carlito, which has the same letter widths.

**Script.** Copy comes from talktalent.com.

| Time | Scene |
|---|---|
| 0–4.4s | TALK wordmark wipes up. Subtitle reads "Community Discussion Forum". The logo then moves to the top-left corner. |
| 4.4–9.8s | "The private community for **TA leaders.**" |
| 9.8–15.4s | Curated. Invite-only. Away from the noise. Then: every member is reviewed and approved, no lurkers, no spam. |
| 15.4–21.2s | **13,000+** TA leaders across North America. Run by practitioners, for practitioners. Zero vendor bias. |
| 21.2–25.6s | "Built for people who **do the work.**" with Connect · Learn · Hire · Grow |
| 25.6–30s | End card: TALK logo, "Let's keep the conversation going.", talktalent.com |

## Editing and re-rendering

- Preview: open `bumper.html` in a browser. It loops in real time.
- Copy, timings and colours are all set in `bumper.html`. Scene timings live in the `T` object.
- Render: `NODE_PATH=$(npm root -g) node render.mjs` (needs Playwright + ffmpeg). Pass `--stills 3,8,13` to output PNG frames instead of a video.
- Add music in an editor, or: `ffmpeg -i talk-forum-bumper.mp4 -i music.mp3 -c:v copy -c:a aac -shortest -af "afade=t=out:st=28:d=2" out.mp4`
