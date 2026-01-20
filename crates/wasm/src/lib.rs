use std::cell::RefCell;
use wasm_bindgen::prelude::*;

// ============================================================================
// FIBONACCI FUNCTIONS
// ============================================================================

/// Recursive fibonacci - O(2^n) complexity
/// Kept for benchmark comparison purposes
#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

/// Iterative fibonacci - O(n) complexity
/// ~1000x faster than recursive for n=40
#[wasm_bindgen]
pub fn fibonacci_iter(n: u32) -> u64 {
    if n == 0 {
        return 0;
    }
    let (mut a, mut b) = (0u64, 1u64);
    for _ in 1..n {
        let temp = a.wrapping_add(b);
        a = b;
        b = temp;
    }
    b
}

fn fibonacci_iter_u32(n: u32) -> u32 {
    if n == 0 {
        return 0;
    }
    let (mut a, mut b) = (0u32, 1u32);
    for _ in 1..n {
        let temp = a.wrapping_add(b);
        a = b;
        b = temp;
    }
    b
}

// ============================================================================
// MEMORY UTILITIES
// ============================================================================

#[wasm_bindgen]
pub fn alloc_f64(len: usize) -> *mut f64 {
    let mut buf = Vec::<f64>::with_capacity(len);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

#[wasm_bindgen]
pub fn free_f64(ptr: *mut f64, len: usize) {
    if ptr.is_null() || len == 0 {
        return;
    }
    unsafe {
        let _ = Vec::from_raw_parts(ptr, len, len);
    }
}

#[wasm_bindgen]
pub fn alloc_u32(len: usize) -> *mut u32 {
    let mut buf = Vec::<u32>::with_capacity(len);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

#[wasm_bindgen]
pub fn free_u32(ptr: *mut u32, len: usize) {
    if ptr.is_null() || len == 0 {
        return;
    }
    unsafe {
        let _ = Vec::from_raw_parts(ptr, len, len);
    }
}

// ============================================================================
// ARRAY OPERATIONS
// ============================================================================

#[wasm_bindgen]
pub fn process_shared_buffer(arr: &mut [u32]) {
    for value in arr.iter_mut() {
        *value = fibonacci_iter_u32(*value);
    }
}

#[wasm_bindgen]
pub fn process_shared_buffer_ptr(ptr: *mut u32, len: usize) {
    let arr = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    process_shared_buffer(arr);
}

#[wasm_bindgen]
pub fn sum_u32(arr: &[u32]) -> u32 {
    arr.iter().copied().sum()
}

#[wasm_bindgen]
pub fn sum_u32_sab(arr: &[u32]) -> u32 {
    arr.iter().copied().sum()
}

/// SIMD-style sum for f32 arrays using loop unrolling
/// Manual unrolling mimics SIMD behavior for better performance
#[wasm_bindgen]
pub fn sum_f32_simd(arr: &[f32]) -> f32 {
    #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
    unsafe {
        return sum_f32_simd128(arr);
    }
    sum_f32_fallback(arr)
}

fn sum_f32_fallback(arr: &[f32]) -> f32 {
    let chunks = arr.chunks_exact(4);
    let remainder = chunks.remainder();
    
    let mut sum0 = 0.0f32;
    let mut sum1 = 0.0f32;
    let mut sum2 = 0.0f32;
    let mut sum3 = 0.0f32;
    
    for chunk in chunks {
        sum0 += chunk[0];
        sum1 += chunk[1];
        sum2 += chunk[2];
        sum3 += chunk[3];
    }
    
    let mut total = sum0 + sum1 + sum2 + sum3;
    for &val in remainder {
        total += val;
    }
    total
}

#[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
#[target_feature(enable = "simd128")]
unsafe fn sum_f32_simd128(arr: &[f32]) -> f32 {
    use core::arch::wasm32::*;
    let mut acc = f32x4_splat(0.0);
    let chunks = arr.chunks_exact(4);
    let remainder = chunks.remainder();

    for chunk in chunks {
        let v = v128_load(chunk.as_ptr() as *const v128);
        acc = f32x4_add(acc, v);
    }

    let mut out = [0f32; 4];
    v128_store(out.as_mut_ptr() as *mut v128, acc);
    let mut total = out[0] + out[1] + out[2] + out[3];
    for &val in remainder {
        total += val;
    }
    total
}

/// SIMD-style dot product using loop unrolling
/// 4-way parallel accumulation for better CPU pipeline utilization
#[wasm_bindgen]
pub fn dot_product_simd(a: &[f32], b: &[f32]) -> f32 {
    #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
    unsafe {
        return dot_product_simd128(a, b);
    }
    dot_product_fallback(a, b)
}

fn dot_product_fallback(a: &[f32], b: &[f32]) -> f32 {
    let len = a.len().min(b.len());
    let a = &a[..len];
    let b = &b[..len];
    
    let mut sum0 = 0.0f32;
    let mut sum1 = 0.0f32;
    let mut sum2 = 0.0f32;
    let mut sum3 = 0.0f32;
    
    let chunks_a = a.chunks_exact(4);
    let chunks_b = b.chunks_exact(4);
    let remainder_a = chunks_a.remainder();
    let remainder_b = chunks_b.remainder();
    
    for (ca, cb) in chunks_a.zip(chunks_b) {
        sum0 += ca[0] * cb[0];
        sum1 += ca[1] * cb[1];
        sum2 += ca[2] * cb[2];
        sum3 += ca[3] * cb[3];
    }
    
    let mut total = sum0 + sum1 + sum2 + sum3;
    for (&va, &vb) in remainder_a.iter().zip(remainder_b.iter()) {
        total += va * vb;
    }
    total
}

#[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
#[target_feature(enable = "simd128")]
unsafe fn dot_product_simd128(a: &[f32], b: &[f32]) -> f32 {
    use core::arch::wasm32::*;
    let len = a.len().min(b.len());
    let a = &a[..len];
    let b = &b[..len];

    let mut acc = f32x4_splat(0.0);
    let chunks_a = a.chunks_exact(4);
    let chunks_b = b.chunks_exact(4);
    let remainder_a = chunks_a.remainder();
    let remainder_b = chunks_b.remainder();

    for (ca, cb) in chunks_a.zip(chunks_b) {
        let va = v128_load(ca.as_ptr() as *const v128);
        let vb = v128_load(cb.as_ptr() as *const v128);
        acc = f32x4_add(acc, f32x4_mul(va, vb));
    }

    let mut out = [0f32; 4];
    v128_store(out.as_mut_ptr() as *mut v128, acc);
    let mut total = out[0] + out[1] + out[2] + out[3];
    for (&va, &vb) in remainder_a.iter().zip(remainder_b.iter()) {
        total += va * vb;
    }
    total
}

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

#[wasm_bindgen]
pub fn grayscale(data: &mut [u8]) {
    #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
    unsafe {
        grayscale_simd128(data);
        return;
    }
    grayscale_scalar(data);
}

fn grayscale_scalar(data: &mut [u8]) {
    for chunk in data.chunks_exact_mut(4) {
        let r = chunk[0] as f32;
        let g = chunk[1] as f32;
        let b = chunk[2] as f32;
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
        chunk[0] = gray;
        chunk[1] = gray;
        chunk[2] = gray;
    }
}

#[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
#[target_feature(enable = "simd128")]
unsafe fn grayscale_simd128(data: &mut [u8]) {
    use core::arch::wasm32::*;
    let pixel_count = data.len() / 4;
    let mut i = 0usize;
    let pixels_ptr = data.as_mut_ptr() as *mut u32;

    let mask = i32x4_splat(0xFF);
    let alpha_mask = i32x4_splat(0xFF000000u32 as i32);
    let weight_r = i32x4_splat(77);
    let weight_g = i32x4_splat(150);
    let weight_b = i32x4_splat(29);
    let rgb_mask = i32x4_splat(0x010101);

    while i + 4 <= pixel_count {
        let ptr = pixels_ptr.add(i) as *const v128;
        let v = v128_load(ptr);
        let r = v128_and(v, mask);
        let g = v128_and(i32x4_shr(v, 8), mask);
        let b = v128_and(i32x4_shr(v, 16), mask);
        let sum = i32x4_add(
            i32x4_add(i32x4_mul(r, weight_r), i32x4_mul(g, weight_g)),
            i32x4_mul(b, weight_b),
        );
        let gray = i32x4_shr(sum, 8);
        let gray_rgb = i32x4_mul(gray, rgb_mask);
        let alpha = v128_and(v, alpha_mask);
        let out = v128_or(alpha, gray_rgb);
        v128_store(pixels_ptr.add(i) as *mut v128, out);
        i += 4;
    }

    let tail_start = i * 4;
    if tail_start < data.len() {
        grayscale_scalar(&mut data[tail_start..]);
    }
}

#[wasm_bindgen]
pub fn box_blur(data: &mut [u8], width: u32, height: u32, radius: u32) {
    let w = width as usize;
    let h = height as usize;
    let r = radius as i32;
    let mut output = vec![0u8; data.len()];

    for y in 0..h {
        for x in 0..w {
            let mut sum_r = 0u32;
            let mut sum_g = 0u32;
            let mut sum_b = 0u32;
            let mut count = 0u32;

            for dy in -r..=r {
                for dx in -r..=r {
                    let nx = x as i32 + dx;
                    let ny = y as i32 + dy;
                    if nx >= 0 && nx < w as i32 && ny >= 0 && ny < h as i32 {
                        let idx = ((ny as usize) * w + (nx as usize)) * 4;
                        sum_r += data[idx] as u32;
                        sum_g += data[idx + 1] as u32;
                        sum_b += data[idx + 2] as u32;
                        count += 1;
                    }
                }
            }

            let idx = (y * w + x) * 4;
            output[idx] = (sum_r / count) as u8;
            output[idx + 1] = (sum_g / count) as u8;
            output[idx + 2] = (sum_b / count) as u8;
            output[idx + 3] = data[idx + 3];
        }
    }

    data.copy_from_slice(&output);
}

// ============================================================================
// FFT & SIGNAL PROCESSING
// ============================================================================

#[wasm_bindgen]
pub fn fft_demo(input: &[f64], output: &mut [f64]) {
    let n = input.len();
    for k in 0..n {
        let mut sum = 0.0;
        for t in 0..n {
            let angle = 2.0 * std::f64::consts::PI * (k as f64) * (t as f64) / (n as f64);
            sum += input[t] * angle.cos();
        }
        output[k] = sum.abs();
    }
}

#[wasm_bindgen]
pub fn generate_signal(buffer: &mut [f64], freq1: f64, freq2: f64, freq3: f64) {
    let n = buffer.len();
    for i in 0..n {
        let t = i as f64 / n as f64;
        buffer[i] = (2.0 * std::f64::consts::PI * freq1 * t).sin()
            + 0.5 * (2.0 * std::f64::consts::PI * freq2 * t).sin()
            + 0.3 * (2.0 * std::f64::consts::PI * freq3 * t).sin();
    }
}

// ============================================================================
// MATRIX OPERATIONS
// ============================================================================

const STRASSEN_THRESHOLD_MIN: usize = 64;
const STRASSEN_THRESHOLD_MAX: usize = 512;
const BLOCK_SIZE: usize = 32;
const BLOCK_THRESHOLD: usize = 512;

static mut STRASSEN_THRESHOLD: usize = 128;

fn is_power_of_two(n: usize) -> bool {
    n != 0 && (n & (n - 1)) == 0
}

#[wasm_bindgen]
pub fn set_strassen_threshold(value: usize) {
    let clamped = value.clamp(STRASSEN_THRESHOLD_MIN, STRASSEN_THRESHOLD_MAX);
    unsafe {
        STRASSEN_THRESHOLD = clamped;
    }
}

#[wasm_bindgen]
pub fn get_strassen_threshold() -> usize {
    unsafe { STRASSEN_THRESHOLD }
}

fn strassen_threshold() -> usize {
    unsafe { STRASSEN_THRESHOLD }
}

struct Workspace {
    buf: Vec<f64>,
    offset: usize,
}

impl Workspace {
    fn with_capacity(capacity: usize) -> Self {
        Self {
            buf: vec![0.0; capacity],
            offset: 0,
        }
    }

    fn mark(&self) -> usize {
        self.offset
    }

    fn reset(&mut self, mark: usize) {
        self.offset = mark;
    }

    fn alloc_ptr(&mut self, len: usize) -> *mut f64 {
        let start = self.offset;
        let end = start + len;
        if end > self.buf.len() {
            panic!("workspace capacity exceeded");
        }
        self.offset = end;
        let ptr = self.buf.as_mut_ptr();
        unsafe { ptr.add(start) }
    }
}

fn matrix_multiply_naive(a: &[f64], b: &[f64], c: &mut [f64], n: usize) {
    for i in 0..n {
        for j in 0..n {
            let mut sum = 0.0;
            for k in 0..n {
                sum += a[i * n + k] * b[k * n + j];
            }
            c[i * n + j] = sum;
        }
    }
}

fn matrix_multiply_blocked(a: &[f64], b: &[f64], c: &mut [f64], n: usize, block: usize) {
    c.fill(0.0);
    let bs = block.max(1);
    let mut ii = 0;
    while ii < n {
        let i_max = (ii + bs).min(n);
        let mut kk = 0;
        while kk < n {
            let k_max = (kk + bs).min(n);
            let mut jj = 0;
            while jj < n {
                let j_max = (jj + bs).min(n);
                for i in ii..i_max {
                    for k in kk..k_max {
                        let a_ik = a[i * n + k];
                        let row = i * n;
                        let col = k * n;
                        for j in jj..j_max {
                            c[row + j] += a_ik * b[col + j];
                        }
                    }
                }
                jj += bs;
            }
            kk += bs;
        }
        ii += bs;
    }
}

/// Naive matrix multiplication - O(n^3)
#[wasm_bindgen]
pub fn matrix_multiply(a: &[f64], b: &[f64], c: &mut [f64], n: usize) {
    if n == 0 {
        return;
    }
    if n <= BLOCK_THRESHOLD {
        matrix_multiply_naive(a, b, c, n);
    } else {
        matrix_multiply_blocked(a, b, c, n, BLOCK_SIZE);
    }
}

/// Strassen matrix multiplication - O(n^2.807)
/// More efficient for large matrices (power of two, threshold tuned)
/// Uses divide-and-conquer with 7 multiplications instead of 8
#[wasm_bindgen]
pub fn matrix_multiply_strassen(a: &[f64], b: &[f64], c: &mut [f64], n: usize) {
    if n == 0 {
        return;
    }
    let threshold = strassen_threshold();
    
    // For small matrices, use naive algorithm (threshold tuned for WASM)
    if n <= threshold {
        matrix_multiply(a, b, c, n);
        return;
    }
    
    // Ensure n is power of 2 for Strassen
    if !is_power_of_two(n) {
        // Pad matrices and use naive for non-power-of-2
        matrix_multiply(a, b, c, n);
        return;
    }
    
    let workspace_len = workspace_required(n, threshold);
    let mut workspace = Workspace::with_capacity(workspace_len);
    strassen_recursive_ws(a, b, c, n, &mut workspace, threshold);
}

fn workspace_required(n: usize, threshold: usize) -> usize {
    if n <= threshold {
        return 0;
    }
    let half = n / 2;
    let size = half * half;
    let level = size * 17;
    level + workspace_required(half, threshold)
}

fn strassen_recursive_ws(a: &[f64], b: &[f64], c: &mut [f64], n: usize, workspace: &mut Workspace, threshold: usize) {
    if n <= threshold {
        // Base case: use naive multiplication (avoid extra blocking overhead)
        matrix_multiply_naive(a, b, c, n);
        return;
    }
    
    let mark = workspace.mark();
    let half = n / 2;
    let size = half * half;
    
    // Allocate submatrices
    let a11_ptr = workspace.alloc_ptr(size);
    let a12_ptr = workspace.alloc_ptr(size);
    let a21_ptr = workspace.alloc_ptr(size);
    let a22_ptr = workspace.alloc_ptr(size);
    let b11_ptr = workspace.alloc_ptr(size);
    let b12_ptr = workspace.alloc_ptr(size);
    let b21_ptr = workspace.alloc_ptr(size);
    let b22_ptr = workspace.alloc_ptr(size);

    let a11 = unsafe { std::slice::from_raw_parts_mut(a11_ptr, size) };
    let a12 = unsafe { std::slice::from_raw_parts_mut(a12_ptr, size) };
    let a21 = unsafe { std::slice::from_raw_parts_mut(a21_ptr, size) };
    let a22 = unsafe { std::slice::from_raw_parts_mut(a22_ptr, size) };
    let b11 = unsafe { std::slice::from_raw_parts_mut(b11_ptr, size) };
    let b12 = unsafe { std::slice::from_raw_parts_mut(b12_ptr, size) };
    let b21 = unsafe { std::slice::from_raw_parts_mut(b21_ptr, size) };
    let b22 = unsafe { std::slice::from_raw_parts_mut(b22_ptr, size) };
    
    // Split matrices
    for i in 0..half {
        for j in 0..half {
            a11[i * half + j] = a[i * n + j];
            a12[i * half + j] = a[i * n + (j + half)];
            a21[i * half + j] = a[(i + half) * n + j];
            a22[i * half + j] = a[(i + half) * n + (j + half)];
            
            b11[i * half + j] = b[i * n + j];
            b12[i * half + j] = b[i * n + (j + half)];
            b21[i * half + j] = b[(i + half) * n + j];
            b22[i * half + j] = b[(i + half) * n + (j + half)];
        }
    }
    
    // Strassen's 7 products
    let m1_ptr = workspace.alloc_ptr(size);
    let m2_ptr = workspace.alloc_ptr(size);
    let m3_ptr = workspace.alloc_ptr(size);
    let m4_ptr = workspace.alloc_ptr(size);
    let m5_ptr = workspace.alloc_ptr(size);
    let m6_ptr = workspace.alloc_ptr(size);
    let m7_ptr = workspace.alloc_ptr(size);
    
    let temp1_ptr = workspace.alloc_ptr(size);
    let temp2_ptr = workspace.alloc_ptr(size);

    let m1 = unsafe { std::slice::from_raw_parts_mut(m1_ptr, size) };
    let m2 = unsafe { std::slice::from_raw_parts_mut(m2_ptr, size) };
    let m3 = unsafe { std::slice::from_raw_parts_mut(m3_ptr, size) };
    let m4 = unsafe { std::slice::from_raw_parts_mut(m4_ptr, size) };
    let m5 = unsafe { std::slice::from_raw_parts_mut(m5_ptr, size) };
    let m6 = unsafe { std::slice::from_raw_parts_mut(m6_ptr, size) };
    let m7 = unsafe { std::slice::from_raw_parts_mut(m7_ptr, size) };
    
    let temp1 = unsafe { std::slice::from_raw_parts_mut(temp1_ptr, size) };
    let temp2 = unsafe { std::slice::from_raw_parts_mut(temp2_ptr, size) };
    
    // M1 = (A11 + A22) * (B11 + B22)
    matrix_add(a11, a22, temp1, half);
    matrix_add(b11, b22, temp2, half);
    strassen_recursive_ws(temp1, temp2, m1, half, workspace, threshold);
    
    // M2 = (A21 + A22) * B11
    matrix_add(a21, a22, temp1, half);
    strassen_recursive_ws(temp1, b11, m2, half, workspace, threshold);
    
    // M3 = A11 * (B12 - B22)
    matrix_sub(b12, b22, temp1, half);
    strassen_recursive_ws(a11, temp1, m3, half, workspace, threshold);
    
    // M4 = A22 * (B21 - B11)
    matrix_sub(b21, b11, temp1, half);
    strassen_recursive_ws(a22, temp1, m4, half, workspace, threshold);
    
    // M5 = (A11 + A12) * B22
    matrix_add(a11, a12, temp1, half);
    strassen_recursive_ws(temp1, b22, m5, half, workspace, threshold);
    
    // M6 = (A21 - A11) * (B11 + B12)
    matrix_sub(a21, a11, temp1, half);
    matrix_add(b11, b12, temp2, half);
    strassen_recursive_ws(temp1, temp2, m6, half, workspace, threshold);
    
    // M7 = (A12 - A22) * (B21 + B22)
    matrix_sub(a12, a22, temp1, half);
    matrix_add(b21, b22, temp2, half);
    strassen_recursive_ws(temp1, temp2, m7, half, workspace, threshold);
    
    // Combine results
    // C11 = M1 + M4 - M5 + M7
    // C12 = M3 + M5
    // C21 = M2 + M4
    // C22 = M1 - M2 + M3 + M6
    for i in 0..half {
        for j in 0..half {
            let idx = i * half + j;
            c[i * n + j] = m1[idx] + m4[idx] - m5[idx] + m7[idx];
            c[i * n + (j + half)] = m3[idx] + m5[idx];
            c[(i + half) * n + j] = m2[idx] + m4[idx];
            c[(i + half) * n + (j + half)] = m1[idx] - m2[idx] + m3[idx] + m6[idx];
        }
    }

    workspace.reset(mark);
}

fn matrix_add(a: &[f64], b: &[f64], c: &mut [f64], n: usize) {
    for i in 0..n * n {
        c[i] = a[i] + b[i];
    }
}

fn matrix_sub(a: &[f64], b: &[f64], c: &mut [f64], n: usize) {
    for i in 0..n * n {
        c[i] = a[i] - b[i];
    }
}

#[wasm_bindgen]
pub fn matrix_multiply_ptr(a_ptr: *const f64, b_ptr: *const f64, c_ptr: *mut f64, n: usize) {
    let size = n * n;
    let a = unsafe { std::slice::from_raw_parts(a_ptr, size) };
    let b = unsafe { std::slice::from_raw_parts(b_ptr, size) };
    let c = unsafe { std::slice::from_raw_parts_mut(c_ptr, size) };
    matrix_multiply(a, b, c, n);
}

#[wasm_bindgen]
pub fn matrix_multiply_strassen_ptr(a_ptr: *const f64, b_ptr: *const f64, c_ptr: *mut f64, n: usize) {
    let size = n * n;
    let a = unsafe { std::slice::from_raw_parts(a_ptr, size) };
    let b = unsafe { std::slice::from_raw_parts(b_ptr, size) };
    let c = unsafe { std::slice::from_raw_parts_mut(c_ptr, size) };
    matrix_multiply_strassen(a, b, c, n);
}

// ============================================================================
// SORTING
// ============================================================================

#[wasm_bindgen]
pub fn quicksort(arr: &mut [f64]) {
    if arr.len() <= 1 {
        return;
    }
    quicksort_iter(arr);
}

#[wasm_bindgen]
pub fn quicksort_ptr(ptr: *mut f64, len: usize) {
    let arr = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    quicksort(arr);
}

thread_local! {
    static QS_STACK: RefCell<Vec<(usize, usize)>> = RefCell::new(Vec::new());
}

fn quicksort_iter(arr: &mut [f64]) {
    QS_STACK.with(|stack_cell| {
        let mut stack = stack_cell.borrow_mut();
        stack.clear();
        stack.push((0, arr.len() - 1));

        while let Some((low, high)) = stack.pop() {
            if low >= high {
                continue;
            }
            let pivot = partition(arr, low, high);
            if pivot > 0 {
                stack.push((low, pivot - 1));
            }
            stack.push((pivot + 1, high));
        }
    });
}

fn partition(arr: &mut [f64], low: usize, high: usize) -> usize {
    let pivot = arr[high];
    let mut i = low;
    for j in low..high {
        if arr[j] <= pivot {
            arr.swap(i, j);
            i += 1;
        }
    }
    arr.swap(i, high);
    i
}

