type ProtocolRow = {
  cryptographicAssetType: string;
  name: string;
  assetType: string;
  version: string;
  cipherSuites: string;
  oid: string;
};

const protocolRows: ProtocolRow[] = [
  {
    cryptographicAssetType: "Protocols",
    name: "TLS",
    assetType: "protocol",
    version: "1.3",
    cipherSuites: "TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256",
    oid: "1.3.6.1.5.5.7.6.1",
  },
  {
    cryptographicAssetType: "Protocols",
    name: "TLS",
    assetType: "protocol",
    version: "1.2",
    cipherSuites: "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384, TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
    oid: "1.3.6.1.5.5.7.6.1",
  },
  {
    cryptographicAssetType: "Protocols",
    name: "IPsec",
    assetType: "protocol",
    version: "IKEv2",
    cipherSuites: "AES-256-GCM, AES-128-GCM, SHA2-384 PRF, ECP256",
    oid: "1.3.6.1.5.5.8.2.2",
  },
  {
    cryptographicAssetType: "Protocols",
    name: "SSH",
    assetType: "protocol",
    version: "2.0",
    cipherSuites: "curve25519-sha256, chacha20-poly1305@openssh.com, aes256-gcm@openssh.com",
    oid: "1.3.6.1.5.5.7.3.21",
  },
  {
    cryptographicAssetType: "Protocols",
    name: "QUIC",
    assetType: "protocol",
    version: "v1 (TLS 1.3)",
    cipherSuites: "TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384",
    oid: "1.3.6.1.5.5.7.3.1",
  },
];

function splitCipherSuites(cipherSuites: string) {
  return cipherSuites.split(",").map((suite) => suite.trim());
}

export default function CbomExplorerProtocolsPage() {
  return (
    <div className="h-full">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-200">Protocols</h3>
        <p className="mt-1 text-xs text-slate-400">
          Element-wise protocol inventory based on the CBOM blueprint.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="cbom-explorer-table min-w-300 w-full text-left text-xs">
          <thead className="border-b border-white/10 bg-slate-950/40 text-slate-300 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2.5">Cryptographic Asset Type</th>
              <th className="px-3 py-2.5">Name</th>
              <th className="px-3 py-2.5">Asset Type</th>
              <th className="px-3 py-2.5">Version</th>
              <th className="px-3 py-2.5">Cipher Suites</th>
              <th className="px-3 py-2.5">OID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {protocolRows.map((row) => (
              <tr key={`${row.name}-${row.version}`} className="cbom-explorer-row hover:bg-white/3 align-top">
                <td className="px-3 py-3 text-slate-300">{row.cryptographicAssetType}</td>
                <td className="px-3 py-3 font-medium text-slate-100 whitespace-nowrap">{row.name}</td>
                <td className="px-3 py-3 whitespace-nowrap">{row.assetType}</td>
                <td className="px-3 py-3 whitespace-nowrap">{row.version}</td>
                <td className="px-3 py-3">
                  <div className="space-y-1">
                    {splitCipherSuites(row.cipherSuites).map((suite) => (
                      <div key={`${row.name}-${row.version}-${suite}`} className="leading-5">
                        {suite}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-[11px] whitespace-nowrap">{row.oid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
