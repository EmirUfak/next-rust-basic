# next-rust-basic Template

Next.js 16, React 19 ve Rust (WebAssembly) ile yüksek performanslı web uygulamaları geliştirmek için production-ready (üretime hazır) bir şablon.

[English Version Below](#next-rust-basic-template-english)

## Özellikler

- **Next.js 16 (App Router):** Server Components ve Turbopack (WASM uyumluluğu için Webpack konfigürasyonu yapılmış) dahil en güncel özellikler.
- **Rust & WebAssembly:** Yüksek performanslı hesaplama işlemleri için `wasm-bindgen` tabanlı iş akışı.
- **Web Workers:** Ağır hesaplamaların ana thread'i bloklamaması için Web Worker entegrasyonu.
- **SharedArrayBuffer:** Worker ve Ana Thread arasında sıfır kopyalama (zero-copy) veri transferi desteği.
- **React 19:** Otomatik optimizasyon için React Compiler aktif.
- **TypeScript:** Tip güvenliği için Strict mod açık.
- **State Management:** Verimli global durum yönetimi için Zustand.
- **Performans Analizi:** `@next/bundle-analyzer` önceden yapılandırılmış.
- **Tailwind CSS:** Tailwind v4 ile modern stillendirme.

## Performans Teknolojileri

- **SIMD-Style Operations:** 4-way loop unrolling ile paralel hesaplama
- **Strassen Algorithm:** Büyük matrisler için O(n^2.807) karmaşıklık
- **wasm-opt O3:** Binaryen ile maksimum optimizasyon (%22 küçülme)
- **Atomics:** SharedArrayBuffer senkronizasyonu için donanım seviyesi kilitleme
- **Enhanced Build:** LTO, single codegen unit ve panic=abort ile küçük binary

## Demo Özellikleri

- **Fibonacci Benchmark:** Recursive vs Iterative, JS vs WASM karşılaştırması
- **Matrix Multiplication:** Naive O(n³) vs Strassen O(n^2.807)
- **Array Sorting (Quicksort):** 1K - 10M element, JS vs WASM karşılaştırması
- **SharedArrayBuffer Demo:** Atomics senkronizasyonu ile toplu fibonacci işleme

## Gereksinimler

Başlamadan önce aşağıdakilerin kurulu olduğundan emin olun:

- **Node.js** (v18 veya üzeri)
- **Rust & Cargo:** [Rust Kurulumu](https://www.rust-lang.org/tools/install)
- **(Opsiyonel) wasm-bindgen-cli:** JS/TS bağlayıcıları için gereklidir.
- **(Opsiyonel) wasm-opt (binaryen):** Ek optimizasyon için.

### Windows için Visual Studio Build Tools

`wasm-bindgen` kurulumu sırasında `link.exe` hatası alırsanız:

1. Visual Studio Build Tools indirin: https://visualstudio.microsoft.com/downloads/
2. "Desktop development with C++" iş yükünü seçin.
3. "MSVC v143" ve "Windows 10/11 SDK" bileşenlerini işaretleyin.
4. Kurulum sonrası terminali kapatıp açın ve tekrar deneyin.

### wasm-bindgen Kurulumu (Windows)

1. Rust yüklü olduğundan emin olun.
2. `cargo install wasm-bindgen-cli` ile kurulumu yapın.
3. Terminali kapatıp yeniden açın (PATH güncellemesi için).
4. `wasm-bindgen --version` ile doğrulayın.

## Başlangıç

Bu şablonu kullanarak yeni bir proje oluşturmanın en kolay yolu:

### Yöntem 1: create-next-app ile (Önerilen)

```bash
npx create-next-app -e https://github.com/emirufak/next-rust-basic projenizin-adi
```

### Yöntem 2: Manuel Kurulum

1.  **Depoyu klonlayın:**

    ```bash
    git clone https://github.com/emirufak/next-rust-basic.git projenizin-adi
    cd projenizin-adi
    ```

2.  **Bağımlılıkları yükleyin:**
    Rust ve `wasm-bindgen` kuruluysa WASM derlemesi otomatik çalışır. Eksikse adım atlanır.
    İsterseniz `SKIP_WASM_BUILD=1` ile bu adımı manuel hale getirebilirsiniz.

    ```bash
    npm install
    ```

3.  **Geliştirme sunucusunu başlatın:**

    ```bash
    npm run dev
    ```

4.  **Tarayıcınızı açın:**
    Demoyu görmek için [http://localhost:3000](http://localhost:3000) adresine gidin.

## Proje Yapısı

```plaintext
├── crates/
│   └── wasm/               # Rust kaynak kodları (wasm-lib)
├── public/                 # Statik dosyalar
├── src/
│   ├── app/                # Next.js App Router sayfaları
│   ├── components/         # React bileşenleri
│   ├── lib/                # Yardımcı fonksiyonlar & State yönetimi
│   ├── workers/            # Web Worker dosyaları
├── scripts/                # Yardımcı build script'leri
├── tests/                  # Testler (unit/e2e)
├── next.config.ts          # Next.js konfigürasyonu (WASM & Analyzer)
└── package.json            # Proje betikleri ve bağımlılıklar
```

## Komutlar (Scripts)

- `npm run dev`: Geliştirme sunucusunu başlatır.
- `npm run build`: Uygulamayı production için derler.
- `npm run start`: Production sunucusunu başlatır.
- `npm run build:wasm`: Rust kodunu manuel olarak WASM'a derler (wasm-bindgen pipeline).
- `npm run analyze`: Build boyutunu görselleştirmek için bundle analyzer'ı çalıştırır.
- `npm run test`: Unit testleri çalıştırır.
- `npm run test:e2e`: E2E testleri çalıştırır.

## Geliştirme

### Rust Kodu Ekleme

1.  `crates/wasm/src/lib.rs` dosyasını düzenleyin.
2.  Fonksiyonları `#[wasm_bindgen]` kullanarak dışa aktarın.
3.  `npm run build:wasm` komutunu çalıştırın.
4.  `src/workers/` altında yeni bir worker oluşturun veya mevcut worker'a ekleyin.
5.  React bileşenlerinizde worker'ı çağırarak kullanın.

## Lisans

MIT

---

<a id="next-rust-basic-template-english"></a>

# next-rust-basic Template (English)

A production-ready template for building high-performance web applications with Next.js 16, React 19, and Rust (WebAssembly).

## Features

- **Next.js 16 (App Router):** Latest features including Server Components and Turbopack (configured with Webpack for WASM compatibility).
- **Rust & WebAssembly:** `wasm-bindgen`-based workflow for high-performance computing tasks.
- **Web Workers:** Worker pool with round-robin scheduling to prevent blocking the main thread.
- **SharedArrayBuffer:** Zero-copy data transfer between Worker and Main Thread with Atomics synchronization.
- **React 19:** React Compiler enabled for automatic optimization.
- **TypeScript:** Strict mode enabled for type safety.
- **State Management:** Zustand for efficient global state management.
- **Performance Analysis:** `@next/bundle-analyzer` pre-configured.
- **Tailwind CSS:** Modern styling with Tailwind v4.

## Performance Technologies

- **SIMD-Style Operations:** 4-way loop unrolling for parallel accumulation
- **Strassen Algorithm:** O(n^2.807) matrix multiplication for large matrices
- **wasm-opt O3:** Maximum optimization via binaryen npm package (22% size reduction)
- **Atomics:** Hardware-level synchronization for SharedArrayBuffer
- **Enhanced Build:** LTO, single codegen unit, and panic=abort for smaller binary

## Demo Features

- **Fibonacci Benchmark:** Recursive vs Iterative, JS vs WASM comparison
- **Matrix Multiplication:** Naive O(n³) vs Strassen O(n^2.807)
- **Array Sorting (Quicksort):** 1K - 10M elements, JS vs WASM comparison
- **SharedArrayBuffer Demo:** Batch fibonacci processing with Atomics synchronization

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

The easiest way to create a new project using this template:

### Method 1: Using create-next-app (Recommended)

```bash
npx create-next-app -e https://github.com/emirufak/next-rust-basic your-project-name
```

### Method 2: Manual Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/emirufak/next-rust-basic.git your-project-name
    cd your-project-name
    ```

2.  **Install dependencies:**
    If Rust and `wasm-bindgen` are available, the WASM build runs automatically. If not, it is skipped.
    You can force skip with `SKIP_WASM_BUILD=1` and run `npm run build:wasm` manually later.

    ```bash
    npm install
    ```

3.  **Run the development server:**

    ```bash
    npm run dev
    ```

4.  **Open your browser:**
    Navigate to [http://localhost:3000](http://localhost:3000) to see the demo.

## Project Structure

```plaintext
├── crates/
│   └── wasm/               # Rust source code (wasm-lib)
├── public/                 # Static assets
├── src/
│   ├── app/                # Next.js App Router pages
│   ├── components/         # React components
│   ├── lib/                # Utility functions & State management
│   ├── workers/            # WASM Worker pool
├── scripts/                # Helper build scripts
├── tests/                  # Tests (unit/e2e)
├── next.config.ts          # Next.js configuration (WASM & Analyzer)
└── package.json            # Project scripts and dependencies
```

## Scripts

| Command              | Description                           |
| -------------------- | ------------------------------------- |
| `npm run dev`        | Starts the development server         |
| `npm run build`      | Builds the application for production |
| `npm run start`      | Starts the production server          |
| `npm run build:wasm` | Manually builds Rust code to WASM     |
| `npm run analyze`    | Runs bundle analyzer                  |
| `npm run test`       | Runs unit tests (Vitest)              |
| `npm run test:e2e`   | Runs E2E tests (Playwright)           |

## Development

### Adding Rust Code

1. Edit `crates/wasm/src/lib.rs`.
2. Expose functions using `#[wasm_bindgen]`.
3. Run `npm run build:wasm`.
4. Add message types to `src/workers/worker-messages.ts`.
5. Add handlers in `src/workers/wasm.worker.ts`.
6. Call from React components via the worker pool.

### WASM Functions Available

| Function                               | Description                          |
| -------------------------------------- | ------------------------------------ |
| `fibonacci(n)`                         | Recursive fibonacci - O(2^n)         |
| `fibonacci_iter(n)`                    | Iterative fibonacci - O(n)           |
| `sum_u32(arr)`                         | Sum of u32 array                     |
| `sum_f32_simd(arr)`                    | SIMD-style sum with 4-way unrolling  |
| `dot_product_simd(a, b)`               | SIMD-style dot product               |
| `matrix_multiply(a, b, c, n)`          | Naive matrix multiplication - O(n³)  |
| `matrix_multiply_strassen(a, b, c, n)` | Strassen algorithm - O(n^2.807)      |
| `quicksort(arr)`                       | In-place quicksort                   |
| `grayscale(data)`                      | Convert RGBA to grayscale (in-place) |
| `box_blur(data, w, h, r)`              | Apply box blur filter (in-place)     |
| `fft_demo(input, output)`              | Compute DFT magnitude spectrum       |
| `generate_signal(out, f1, f2, f3)`     | Generate test signal                 |

## License

MIT
