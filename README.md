
<img width="1206" height="896" alt="rust-readme" src="https://github.com/user-attachments/assets/2296ceea-9cf0-4a48-8c42-264ee98f5f24" />

# next-rust-basic Template

Next.js 16, React 19 ve Rust (WebAssembly) ile yuksek performansli web uygulamalari gelistirmek icin production-ready (uretime hazir) bir sablon.

[English Version Below](#next-rust-basic-template-english)

## Ozellikler

- **Next.js 16 (App Router):** Server Components ve Turbopack (WASM uyumlulugu icin Webpack konfigrasyonu yapilmis) dahil en guncel ozellikler.
- **Rust & WebAssembly:** Yuksek performansli hesaplama islemleri icin `wasm-bindgen` tabanli is akis.
- **Web Workers:** Agir hesaplamalarin ana thread'i bloklamamasi icin worker pool.
- **SharedArrayBuffer:** Main thread ile Worker arasinda zero-copy veri aktarimi.
- **React 19:** React Compiler aktif.
- **TypeScript:** Strict mod acik.
- **State Management:** Zustand ile hafif ve hizli durum yonetimi.
- **Performans Analizi:** `@next/bundle-analyzer` onceden yapilandirilmis.
- **Tailwind CSS:** Tailwind v4 ile modern stillendirme.

## Performans Teknolojileri

- **SIMD128 (v128):** sum/dot/grayscale icin gercek SIMD yolu + scalar fallback.
- **Strassen Algorithm:** Buyuk matrisler icin O(n^2.807) karmasiklik.
- **wasm-opt O3:** Binaryen ile maksimum optimizasyon (tipik olarak %20+ kuculme).
- **Atomics:** SharedArrayBuffer senkronizasyonu icin donanim seviyesi kilitleme.
- **Enhanced Build:** LTO, single codegen unit ve panic=abort ile kucuk binary.

> Not: SharedArrayBuffer zero-copy aktarim main thread <-> worker arasindadir. Varsayilan wasm-bindgen baglantilarinda JS typed array verisi wasm bellegine kopyalanir. Matrix ve sort benchmarklari pointer API + wasm bellegi gorunumu ile bu kopyayi atlar. `WASM_SHARED=1` build aktifse, JS tarafi wasm.memory.buffer uzerinden dogrudan paylasimli bellek kullanabilir; bu yol pure compute icin her zaman daha hizli olmayabilir.

## Demo Ozellikleri

- **Fibonacci Benchmark:** JS vs WASM karsilastirmasi (worker icinde).
- **Matrix Multiplication:** JS naive O(n^3) ve WASM icin opsiyonel Strassen (power-of-two, n >= 128).
- **Array Sorting (Quicksort):** 1K - 50M element (WASM bellek gorunumu ile kopyasiz).
- **SharedArrayBuffer Demo:** Atomics senkronizasyonu ile toplu fibonacci_iter islemi (compute time ve round-trip ayri gosterilir).

## Gereksinimler

Baslamadan once asagidakilerin kurulu oldugundan emin olun:

- **Node.js** (v18 veya uzeri)
- **Rust & Cargo:** [Rust Kurulumu](https://www.rust-lang.org/tools/install)
- **(Opsiyonel) wasm-bindgen-cli:** JS/TS baglayicilari icin gereklidir.
- **(Opsiyonel) wasm-opt (binaryen):** Ek optimizasyon icin.

### Windows icin Visual Studio Build Tools

`wasm-bindgen` kurulumu sirasinda `link.exe` hatasi alirsaniz:

1. Visual Studio Build Tools indirin: https://visualstudio.microsoft.com/downloads/
2. "Desktop development with C++" is yukunu secin.
3. "MSVC v143" ve "Windows 10/11 SDK" bilesenlerini isaretleyin.
4. Kurulum sonrasi terminali kapatip acin ve tekrar deneyin.

### wasm-bindgen Kurulumu (Windows)

1. Rust yuklu oldugundan emin olun.
2. `cargo install wasm-bindgen-cli` ile kurulumu yapin.
3. Terminali kapatip yeniden acin (PATH guncellemesi icin).
4. `wasm-bindgen --version` ile dogrulayin.

## Baslangic

Bu sablonu kullanarak yeni bir proje olusturmanin en kolay yolu:

### Yontem 1: create-next-app ile (Onerilen)

```bash
npx create-next-app -e https://github.com/emirufak/next-rust-basic projenizin-adi
```

### Yontem 2: Manuel Kurulum

1. **Depoyu klonlayin:**

   ```bash
   git clone https://github.com/emirufak/next-rust-basic.git projenizin-adi
   cd projenizin-adi
   ```

2. **Bagimliliklari yukleyin:**
   Rust ve `wasm-bindgen` kuruluysa WASM derlemesi otomatik calisir. Eksikse adim atlanir.
   Isterseniz `SKIP_WASM_BUILD=1` ile bu adimi manuel hale getirebilirsiniz.

   ```bash
   npm install
   ```

3. **Gelistirme sunucusunu baslatin:**

   ```bash
   npm run dev
   ```

4. **Tarayicinizi acin:**
   Demoyu gormek icin [http://localhost:3000](http://localhost:3000) adresine gidin.

## Proje Yapisi

```plaintext
crates/
  wasm/               # Rust kaynak kodlari (wasm-lib)
public/               # Statik dosyalar
src/
  app/                # Next.js App Router sayfalari
  components/         # React bilesenleri
  lib/                # Yardimci fonksiyonlar & state yonetimi
  workers/            # Web Worker dosyalari
scripts/              # Yardimci build script'leri
tests/                # Testler (unit/e2e)
next.config.ts        # Next.js konfigurasyonu (WASM & Analyzer)
package.json          # Proje betikleri ve bagimliliklar
```

## Komutlar (Scripts)

| Command              | Description                           |
| -------------------- | ------------------------------------- |
| `npm run dev`        | Gelistirme sunucusunu baslatir        |
| `npm run dev:shared` | Shared memory build ile dev baslatir  |
| `npm run build`      | Production build alir                 |
| `npm run start`      | Production sunucusunu baslatir        |
| `npm run build:wasm` | Rust kodunu WASM'a derler             |
| `npm run build:wasm:shared` | Shared memory (SAB) destekli WASM derler |
| `npm run analyze`    | Bundle analyzer calistirir            |
| `npm run test`       | Unit testleri calistirir              |
| `npm run test:e2e`   | E2E testleri calistirir               |

## Gelistirme

### Rust Kodu Ekleme

1. `crates/wasm/src/lib.rs` dosyasini duzenleyin.
2. Fonksiyonlari `#[wasm_bindgen]` kullanarak disa aktarin.
3. `npm run build:wasm` komutunu calistirin.
4. `src/workers/worker-messages.ts` altinda yeni tip ekleyin.
5. `src/workers/wasm/handlers` altinda handler ekleyin.
6. React bilesenlerinde worker pool uzerinden cagirin.

### Shared Memory Build (Optional)

SharedArrayBuffer tabanli WASM memory icin:

```bash
npm run build:wasm:shared
```

> Not: Shared memory build icin COOP/COEP gereklidir (bu template bunu zaten ayarlar).
> Ek gereksinimler: `rustup toolchain install nightly`, `rustup component add rust-src --toolchain nightly`, `rustup target add wasm32-unknown-unknown --toolchain nightly`.
> Bu build atomics + shared-memory flag'leri kullanir; saf compute testlerinde bazen daha yavas olabilir.

### WASM Functions Available

| Function                               | Description                                  |
| -------------------------------------- | -------------------------------------------- |
| `fibonacci(n)`                         | Recursive fibonacci - O(2^n)                 |
| `fibonacci_iter(n)`                    | Iterative fibonacci - O(n)                   |
| `process_shared_buffer(arr)`           | Batch fibonacci_iter on shared buffer        |
| `sum_u32(arr)`                         | Sum of u32 array                             |
| `sum_f32_simd(arr)`                    | SIMD128 (v128) sum + scalar fallback         |
| `dot_product_simd(a, b)`               | SIMD128 (v128) dot product + fallback        |
| `matrix_multiply(a, b, c, n)`          | Naive matrix multiplication - O(n^3)         |
| `matrix_multiply_strassen(a, b, c, n)` | Strassen algorithm - O(n^2.807)              |
| `quicksort(arr)`                       | In-place quicksort                           |
| `grayscale(data)`                      | Convert RGBA to grayscale (in-place)         |
| `box_blur(data, w, h, r)`              | Apply box blur filter (in-place)             |
| `fft_demo(input, output)`              | Compute DFT magnitude spectrum               |
| `generate_signal(out, f1, f2, f3)`     | Generate test signal                         |

> Not: Pointer tabanli API'ler (alloc/free + `*_ptr`) buyuk veri icin zero-copy yol saglar.

## Lisans

MIT

---

<a id="next-rust-basic-template-english"></a>

# next-rust-basic Template (English)

A production-ready template for building high-performance web applications with Next.js 16, React 19, and Rust (WebAssembly).

## Features

- **Next.js 16 (App Router):** Latest features including Server Components and Turbopack (configured with Webpack for WASM compatibility).
- **Rust & WebAssembly:** `wasm-bindgen`-based workflow for high-performance computing tasks.
- **Web Workers:** Worker pool to avoid blocking the main thread.
- **SharedArrayBuffer:** Zero-copy data transfer between the main thread and workers.
- **React 19:** React Compiler enabled for automatic optimization.
- **TypeScript:** Strict mode enabled for type safety.
- **State Management:** Zustand for lightweight global state management.
- **Performance Analysis:** `@next/bundle-analyzer` pre-configured.
- **Tailwind CSS:** Modern styling with Tailwind v4.

## Performance Technologies

- **SIMD128 (v128):** Real SIMD path for sum/dot/grayscale with scalar fallback.
- **Strassen Algorithm:** O(n^2.807) matrix multiplication for large matrices.
- **wasm-opt O3:** Maximum optimization via binaryen (typically 20%+ smaller).
- **Atomics:** Hardware-level synchronization for SharedArrayBuffer.
- **Enhanced Build:** LTO, single codegen unit, and panic=abort for smaller binaries.

> Note: SharedArrayBuffer zero-copy is between main thread and worker only. wasm-bindgen copies JS typed arrays into wasm memory. Matrix and sort benchmarks avoid this by writing directly into wasm memory. With `WASM_SHARED=1`, JS can access wasm.memory.buffer as shared memory; pure compute can be slower in this mode.

## Demo Features

- **Fibonacci Benchmark:** JS vs WASM comparison (both in worker).
- **Matrix Multiplication:** JS naive O(n^3) with optional Strassen in WASM (power-of-two, n >= 128).
- **Array Sorting (Quicksort):** 1K - 50M elements (direct wasm memory view).
- **SharedArrayBuffer Demo:** Batch fibonacci_iter with Atomics sync (compute time and round-trip shown separately).

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or later)
- **Rust & Cargo:** [Install Rust](https://www.rust-lang.org/tools/install)
- **(Optional) wasm-bindgen-cli:** Required for generating JS/TS bindings.
- **(Optional) wasm-opt (binaryen):** Optional extra optimizations.

### Visual Studio Build Tools (Windows)

If you see a `link.exe` error while installing `wasm-bindgen`:

1. Download Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/
2. Select the "Desktop development with C++" workload.
3. Enable "MSVC v143" and "Windows 10/11 SDK" components.
4. Restart your terminal and retry the install.

### Installing wasm-bindgen (Windows)

1. Ensure Rust is installed.
2. Run: `cargo install wasm-bindgen-cli`.
3. Restart your terminal (to refresh PATH).
4. Verify with: `wasm-bindgen --version`.

## Getting Started

### Method 1: Using create-next-app (Recommended)

```bash
npx create-next-app -e https://github.com/emirufak/next-rust-basic your-project-name
```

### Method 2: Manual Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/emirufak/next-rust-basic.git your-project-name
   cd your-project-name
   ```

2. **Install dependencies:**
   If Rust and `wasm-bindgen` are available, the WASM build runs automatically. If not, it is skipped.
   You can force skip with `SKIP_WASM_BUILD=1` and run `npm run build:wasm` manually later.

   ```bash
   npm install
   ```

3. **Run the development server:**

   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the demo.

## Project Structure

```plaintext
crates/
  wasm/               # Rust source code (wasm-lib)
public/               # Static assets
src/
  app/                # Next.js App Router pages
  components/         # React components
  lib/                # Utility functions & state management
  workers/            # WASM Worker pool
scripts/              # Helper build scripts
tests/                # Tests (unit/e2e)
next.config.ts        # Next.js configuration (WASM & Analyzer)
package.json          # Project scripts and dependencies
```

## Scripts

| Command              | Description                           |
| -------------------- | ------------------------------------- |
| `npm run dev`        | Starts the development server         |
| `npm run dev:shared` | Starts dev with shared memory build   |
| `npm run build`      | Builds the application for production |
| `npm run start`      | Starts the production server          |
| `npm run build:wasm` | Manually builds Rust code to WASM     |
| `npm run build:wasm:shared` | Builds WASM with shared memory (SAB) |
| `npm run analyze`    | Runs bundle analyzer                  |
| `npm run test`       | Runs unit tests (Vitest)              |
| `npm run test:e2e`   | Runs E2E tests (Playwright)           |

## Development

### Adding Rust Code

1. Edit `crates/wasm/src/lib.rs`.
2. Expose functions using `#[wasm_bindgen]`.
3. Run `npm run build:wasm`.
4. Add message types to `src/workers/worker-messages.ts`.
5. Add handlers under `src/workers/wasm/handlers`.
6. Call from React components via the worker pool.

### Shared Memory Build (Optional)

For SharedArrayBuffer-backed WASM memory:

```bash
npm run build:wasm:shared
```

> Note: Shared memory builds require COOP/COEP (already enabled in this template).
> Extra requirements: `rustup toolchain install nightly`, `rustup component add rust-src --toolchain nightly`, `rustup target add wasm32-unknown-unknown --toolchain nightly`.
> This build uses atomics + shared-memory flags; pure compute benchmarks can be slower.

### WASM Functions Available

| Function                               | Description                                  |
| -------------------------------------- | -------------------------------------------- |
| `fibonacci(n)`                         | Recursive fibonacci - O(2^n)                 |
| `fibonacci_iter(n)`                    | Iterative fibonacci - O(n)                   |
| `process_shared_buffer(arr)`           | Batch fibonacci_iter on shared buffer        |
| `sum_u32(arr)`                         | Sum of u32 array                             |
| `sum_f32_simd(arr)`                    | SIMD128 (v128) sum + scalar fallback         |
| `dot_product_simd(a, b)`               | SIMD128 (v128) dot product + fallback        |
| `matrix_multiply(a, b, c, n)`          | Naive matrix multiplication - O(n^3)         |
| `matrix_multiply_strassen(a, b, c, n)` | Strassen algorithm - O(n^2.807)              |
| `quicksort(arr)`                       | In-place quicksort                           |
| `grayscale(data)`                      | Convert RGBA to grayscale (in-place)         |
| `box_blur(data, w, h, r)`              | Apply box blur filter (in-place)             |
| `fft_demo(input, output)`              | Compute DFT magnitude spectrum               |
| `generate_signal(out, f1, f2, f3)`     | Generate test signal                         |

> Note: Pointer-based APIs (alloc/free + `*_ptr`) are available for large zero-copy workloads.

## License

MIT
