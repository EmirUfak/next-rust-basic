# next-rust-basic Template

Next.js 16, React 19 ve Rust (WebAssembly) ile yüksek performanslı web uygulamaları geliştirmek için production-ready (üretime hazır) bir şablon.

[English Version Below](#next-rust-basic-template-english)

## Özellikler

- **Next.js 16 (App Router):** Server Components ve Turbopack (WASM uyumluluğu için Webpack konfigürasyonu yapılmış) dahil en güncel özellikler.
- **Rust & WebAssembly:** Yüksek performanslı hesaplama işlemleri için entegre `wasm-pack` iş akışı.
- **React 19:** Otomatik optimizasyon için deneysel React Compiler aktif.
- **TypeScript:** Tip güvenliği için Strict mod açık.
- **State Management:** Verimli global durum yönetimi için Zustand.
- **Performans Analizi:** `@next/bundle-analyzer` önceden yapılandırılmış.
- **Tailwind CSS:** Tailwind v4 ile modern stillendirme.

## Gereksinimler

Başlamadan önce aşağıdakilerin kurulu olduğundan emin olun:

- **Node.js** (v18 veya üzeri)
- **Rust & Cargo:** [Rust Kurulumu](https://www.rust-lang.org/tools/install)
- **(Opsiyonel) wasm-pack:** Proje yerel olarak `wasm-pack` içerir, ancak global kurulum da yapabilirsiniz.

## Başlangıç

Bu şablonu kullanarak yeni bir proje oluşturmanın en kolay yolu:

### Yöntem 1: create-next-app ile (Önerilen)

```bash
npx create-next-app -e https://github.com/kullanici-adiniz/next-rust-basic projenizin-adi
```

### Yöntem 2: Manuel Kurulum

1.  **Depoyu klonlayın:**
    ```bash
    git clone https://github.com/kullanici-adiniz/next-rust-basic.git projenizin-adi
    cd projenizin-adi
    ```

2.  **Bağımlılıkları yükleyin:**
    Bu komut, `postinstall` betiği aracılığıyla Rust WASM modülünü otomatik olarak derleyecektir.
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
│   ├── hooks/              # Custom hook'lar (WASM yükleyici dahil)
│   ├── lib/                # Yardımcı fonksiyonlar & State yönetimi
├── next.config.ts          # Next.js konfigürasyonu (WASM & Analyzer)
└── package.json            # Proje betikleri ve bağımlılıklar
```

## Komutlar (Scripts)

- `npm run dev`: Geliştirme sunucusunu başlatır.
- `npm run build`: Uygulamayı production için derler.
- `npm run start`: Production sunucusunu başlatır.
- `npm run build:wasm`: Rust kodunu manuel olarak WASM'a derler.
- `npm run analyze`: Build boyutunu görselleştirmek için bundle analyzer'ı çalıştırır.

## Geliştirme

### Rust Kodu Ekleme

1.  `crates/wasm/src/lib.rs` dosyasını düzenleyin.
2.  Fonksiyonları `#[wasm_bindgen]` kullanarak dışa aktarın.
3.  `npm run build:wasm` komutunu çalıştırın (veya watcher kuruluysa dev sunucusunu yeniden başlatın).
4.  `src/hooks/use-wasm.ts` üzerinden React bileşenlerinizde import edip kullanın.

## Lisans

MIT

---

<a id="next-rust-basic-template-english"></a>

# next-rust-basic Template (English)

A production-ready template for building high-performance web applications with Next.js 16, React 19, and Rust (WebAssembly).

## Features

- **Next.js 16 (App Router):** Latest features including Server Components and Turbopack (configured for Webpack for WASM compatibility).
- **Rust & WebAssembly:** Integrated `wasm-pack` workflow for high-performance computing tasks.
- **React 19:** Experimental React Compiler enabled for automatic optimization.
- **TypeScript:** Strict mode enabled for type safety.
- **State Management:** Zustand for efficient global state management.
- **Performance Analysis:** `@next/bundle-analyzer` pre-configured.
- **Tailwind CSS:** Modern styling with Tailwind v4.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or later)
- **Rust & Cargo:** [Install Rust](https://www.rust-lang.org/tools/install)
- **(Optional) wasm-pack:** The project includes `wasm-pack` locally, but you can also install it globally.

## Getting Started

The easiest way to create a new project using this template:

### Method 1: Using create-next-app (Recommended)

```bash
npx create-next-app -e https://github.com/your-username/next-rust-basic your-project-name
```

### Method 2: Manual Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/next-rust-basic.git your-project-name
    cd your-project-name
    ```

2.  **Install dependencies:**
    This command will automatically build the Rust WASM module via the `postinstall` script.
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
│   ├── hooks/              # Custom hooks (including WASM loader)
│   ├── lib/                # Utility functions & State management
├── next.config.ts          # Next.js configuration (WASM & Analyzer)
└── package.json            # Project scripts and dependencies
```

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run build:wasm`: Manually builds the Rust code to WASM.
- `npm run analyze`: Runs the bundle analyzer to visualize build size.

## Development

### Adding Rust Code

1.  Edit `crates/wasm/src/lib.rs`.
2.  Expose functions using `#[wasm_bindgen]`.
3.  Run `npm run build:wasm` (or restart the dev server if you have a watcher set up).
4.  Import and use in your React components via `src/hooks/use-wasm.ts`.

## License

MIT
