#!/bin/bash

# Performance Verification Script
# Tests all performance optimizations

echo "⚡ GitHub Stats API - Performance Verification"
echo "=============================================="
echo ""

BASE_URL="${1:-http://localhost:3000}"
USERNAME="${2:-pphatdev}"

echo "📍 Testing endpoint: $BASE_URL"
echo "👤 Testing username: $USERNAME"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

passed=0
failed=0

# Test function
test_feature() {
    local name="$1"
    local command="$2"
    local expected="$3"
    
    echo -n "Testing $name... "
    
    result=$(eval "$command" 2>&1)
    
    if echo "$result" | grep -q "$expected"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((passed++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Expected: $expected"
        echo "  Got: $result"
        ((failed++))
        return 1
    fi
}

echo "🔍 Running Performance Tests..."
echo ""

# 1. Health Check
test_feature "Health Endpoint" \
    "curl -s $BASE_URL/health | jq -r '.status'" \
    "healthy"

# 2. Metrics Endpoint
test_feature "Metrics Endpoint" \
    "curl -s $BASE_URL/metrics | jq -r '.uptime'" \
    "[0-9]"

# 3. Response Time Header
test_feature "Response Time Header" \
    "curl -sI $BASE_URL/health | grep -i 'X-Response-Time'" \
    "X-Response-Time"

# 4. Compression
test_feature "Compression (Accept-Encoding)" \
    "curl -sI -H 'Accept-Encoding: gzip' $BASE_URL/stats?username=$USERNAME | grep -i 'Content-Encoding'" \
    "gzip"

# 5. Cache Headers
test_feature "Cache-Control Headers" \
    "curl -sI $BASE_URL/stats?username=$USERNAME | grep -i 'Cache-Control'" \
    "Cache-Control"

# 6. Keep-Alive
test_feature "HTTP Keep-Alive" \
    "curl -sI $BASE_URL/health | grep -i 'Connection'" \
    "keep-alive"

# 7. Security Headers (Helmet)
test_feature "Security Headers (X-Content-Type-Options)" \
    "curl -sI $BASE_URL/health | grep -i 'X-Content-Type-Options'" \
    "nosniff"

# 8. Rate Limit Headers
test_feature "Rate Limit Headers" \
    "curl -sI $BASE_URL/stats?username=$USERNAME | grep -i 'X-RateLimit-Limit'" \
    "X-RateLimit-Limit"

# 9. Stats Endpoint
test_feature "Stats Endpoint Response" \
    "curl -s '$BASE_URL/stats?username=$USERNAME' | head -c 10" \
    "svg"

# 10. API Documentation
test_feature "API Documentation" \
    "curl -s $BASE_URL/ | jq -r '.name'" \
    "GitHub Stats API"

echo ""
echo "=============================================="
echo "📊 Test Results"
echo "=============================================="
echo -e "Passed: ${GREEN}$passed${NC}"
echo -e "Failed: ${RED}$failed${NC}"
echo ""

# Performance Benchmark
echo "🔥 Running Performance Benchmark..."
echo ""

if command -v ab &> /dev/null; then
    echo "Testing with Apache Bench (100 requests, 10 concurrent)..."
    ab -n 100 -c 10 -g /dev/null "$BASE_URL/health" 2>/dev/null | grep -E "Requests per second|Time per request|Failed requests"
    echo ""
else
    echo "⚠️  Apache Bench (ab) not installed. Skipping benchmark."
    echo "Install with: apt-get install apache2-utils (Ubuntu/Debian)"
    echo ""
fi

# Response Time Test
echo "⏱️  Response Time Test (10 requests)..."
total_time=0
for i in {1..10}; do
    response_time=$(curl -o /dev/null -s -w '%{time_total}\n' "$BASE_URL/health")
    echo "  Request $i: ${response_time}s"
    total_time=$(echo "$total_time + $response_time" | bc)
done
avg_time=$(echo "scale=3; $total_time / 10" | bc)
echo "  Average: ${avg_time}s"
echo ""

# Cache Hit Rate (if Redis is enabled)
echo "💾 Cache Statistics..."
cache_stats=$(curl -s $BASE_URL/health | jq -r '.cache')
echo "$cache_stats" | jq '.'
echo ""

# Memory Usage
echo "💻 Server Memory Usage..."
memory_stats=$(curl -s $BASE_URL/metrics | jq -r '.system.memory')
echo "$memory_stats" | jq '.'
echo ""

# Final Summary
echo "=============================================="
if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Performance optimizations are working.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Check configuration.${NC}"
    exit 1
fi
