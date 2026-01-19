import fs from 'fs';
import path from 'path';

function read(p: string) {
  return fs.readFileSync(p, 'utf8');
}

describe('Hard de-id gate wiring (no raw transcript to UI/DB)', () => {
  const root = path.join(__dirname, '../../..'); // apps/web/src

  it('finalize route uses transcript gate (not direct presidio call)', () => {
    const p = path.join(root, 'app/api/scribe/sessions/[id]/finalize/route.ts');
    const s = read(p);
    expect(s).toContain('deidentifyTranscriptOrThrow');
  });

  it('socket server uses transcript gate before emitting transcript_update', () => {
    const p = path.join(root, 'lib/socket-server.ts');
    const s = read(p);
    expect(s).toContain('deidentifyTranscriptOrThrow');
    expect(s).toContain('co_pilot:transcript_update');
  });

  it('Co-Pilot page no longer embeds RealTimeTranscription (browser->Deepgram)', () => {
    const p = path.join(root, 'app/dashboard/co-pilot/page.tsx');
    const s = read(p);
    expect(s).not.toContain("RealTimeTranscription");
  });
});


