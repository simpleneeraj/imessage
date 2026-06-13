// WebRTC ICE configuration. Public STUN works for most networks; a TURN relay
// (needed for ~10-20% behind symmetric NAT) is optional and read from env, so
// you can ship STUN-only and drop in any provider's credentials later.
//
//   NEXT_PUBLIC_TURN_URL=turn:turn.example.com:3478   (comma-separate for many)
//   NEXT_PUBLIC_TURN_USERNAME=...
//   NEXT_PUBLIC_TURN_CREDENTIAL=...

export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
      ],
    },
  ];

  const url = process.env.NEXT_PUBLIC_TURN_URL;
  const username = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  if (url && username && credential) {
    servers.push({ urls: url.split(','), username, credential });
  }

  return servers;
}

export const hasTurn = (): boolean => Boolean(process.env.NEXT_PUBLIC_TURN_URL);
