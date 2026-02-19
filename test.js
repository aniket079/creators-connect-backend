// 

import dns from "dns/promises";

async function test() {
  try {
    const result = await dns.resolveSrv(
      "_mongodb._tcp.cluster0.vrnobb5.mongodb.net"
    );
    console.log(result);
  } catch (err) {
    console.error("DNS ERROR:", err);
  }
}

test();
