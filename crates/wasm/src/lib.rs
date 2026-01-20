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

/// SIMD-style dot product using loop unrolling
/// 4-way parallel accumulation for better CPU pipeline utilization
#[wasm_bindgen]
pub fn dot_product_simd(a: &[f32], b: &[f32]) -> f32 {
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

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

#[wasm_bindgen]
pub fn grayscale(data: &mut [u8]) {
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

const STRASSEN_THRESHOLD: usize = 128;

fn is_power_of_two(n: usize) -> bool {
    n != 0 && (n & (n - 1)) == 0
}

/// Naive matrix multiplication - O(n^3)
#[wasm_bindgen]
pub fn matrix_multiply(a: &[f64], b: &[f64], c: &mut [f64], n: usize) {
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

/// Strassen matrix multiplication - O(n^2.807)
/// More efficient for large matrices (n >= 128, power of two)
/// Uses divide-and-conquer with 7 multiplications instead of 8
#[wasm_bindgen]
pub fn matrix_multiply_strassen(a: &[f64], b: &[f64], c: &mut [f64], n: usize) {
    if n == 0 {
        return;
    }
    
    // For small matrices, use naive algorithm (threshold tuned for WASM)
    if n <= STRASSEN_THRESHOLD {
        matrix_multiply(a, b, c, n);
        return;
    }
    
    // Ensure n is power of 2 for Strassen
    if !is_power_of_two(n) {
        // Pad matrices and use naive for non-power-of-2
        matrix_multiply(a, b, c, n);
        return;
    }
    
    strassen_recursive(a, b, c, n);
}

fn strassen_recursive(a: &[f64], b: &[f64], c: &mut [f64], n: usize) {
    if n <= STRASSEN_THRESHOLD {
        // Base case: use naive multiplication
        for i in 0..n {
            for j in 0..n {
                let mut sum = 0.0;
                for k in 0..n {
                    sum += a[i * n + k] * b[k * n + j];
                }
                c[i * n + j] = sum;
            }
        }
        return;
    }
    
    let half = n / 2;
    let size = half * half;
    
    // Allocate submatrices
    let mut a11 = vec![0.0; size];
    let mut a12 = vec![0.0; size];
    let mut a21 = vec![0.0; size];
    let mut a22 = vec![0.0; size];
    let mut b11 = vec![0.0; size];
    let mut b12 = vec![0.0; size];
    let mut b21 = vec![0.0; size];
    let mut b22 = vec![0.0; size];
    
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
    let mut m1 = vec![0.0; size];
    let mut m2 = vec![0.0; size];
    let mut m3 = vec![0.0; size];
    let mut m4 = vec![0.0; size];
    let mut m5 = vec![0.0; size];
    let mut m6 = vec![0.0; size];
    let mut m7 = vec![0.0; size];
    
    let mut temp1 = vec![0.0; size];
    let mut temp2 = vec![0.0; size];
    
    // M1 = (A11 + A22) * (B11 + B22)
    matrix_add(&a11, &a22, &mut temp1, half);
    matrix_add(&b11, &b22, &mut temp2, half);
    strassen_recursive(&temp1, &temp2, &mut m1, half);
    
    // M2 = (A21 + A22) * B11
    matrix_add(&a21, &a22, &mut temp1, half);
    strassen_recursive(&temp1, &b11, &mut m2, half);
    
    // M3 = A11 * (B12 - B22)
    matrix_sub(&b12, &b22, &mut temp1, half);
    strassen_recursive(&a11, &temp1, &mut m3, half);
    
    // M4 = A22 * (B21 - B11)
    matrix_sub(&b21, &b11, &mut temp1, half);
    strassen_recursive(&a22, &temp1, &mut m4, half);
    
    // M5 = (A11 + A12) * B22
    matrix_add(&a11, &a12, &mut temp1, half);
    strassen_recursive(&temp1, &b22, &mut m5, half);
    
    // M6 = (A21 - A11) * (B11 + B12)
    matrix_sub(&a21, &a11, &mut temp1, half);
    matrix_add(&b11, &b12, &mut temp2, half);
    strassen_recursive(&temp1, &temp2, &mut m6, half);
    
    // M7 = (A12 - A22) * (B21 + B22)
    matrix_sub(&a12, &a22, &mut temp1, half);
    matrix_add(&b21, &b22, &mut temp2, half);
    strassen_recursive(&temp1, &temp2, &mut m7, half);
    
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
    quicksort_impl(arr, 0, arr.len() - 1);
}

#[wasm_bindgen]
pub fn quicksort_ptr(ptr: *mut f64, len: usize) {
    let arr = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    quicksort(arr);
}

fn quicksort_impl(arr: &mut [f64], low: usize, high: usize) {
    if low < high {
        let pivot = partition(arr, low, high);
        if pivot > 0 {
            quicksort_impl(arr, low, pivot - 1);
        }
        quicksort_impl(arr, pivot + 1, high);
    }
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

