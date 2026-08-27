# Browser dependencies

These browser libraries are served from the same origin so an external CDN
cannot replace executable code after deployment.

| Package | Version | npm tarball SHA-256 | License |
| --- | --- | --- | --- |
| `pdfjs-dist` | 4.10.38 | `1011b38553532d7078c59f26b15a471f8dae00f101b60e2add9b8511737a1ce0` | Apache-2.0 |
| `tesseract.js` | 5.1.1 | `0d08b3722256aacfc652d03b68183a9ed3c997b54778842e7db73ff08a6ae81a` | Apache-2.0 |
| `tesseract.js-core` | 5.1.1 | `8c1c83c01ecbfcaeb62a5a2d1023ea98162cad082aa47b9c2c39c129847dba8a` | Apache-2.0 |
| `html5-qrcode` | 2.3.8 | `e215fbfb27f4b027519014f5bf462ceb3faf2a46dbf8d6dbd2df0e4acef0224e` | Apache-2.0 |

The exact license text for each package is kept beside its files. OCR language
data remains remotely fetched from Project Naptha, but executable JavaScript,
workers and WebAssembly are all same-origin.
