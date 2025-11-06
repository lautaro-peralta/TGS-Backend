#!/bin/bash

##
# TGS Backend - Test Runner Script
# Convenient script for running different test suites
##

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if Docker services are running
check_docker_services() {
    print_header "Checking Docker Services"

    if ! docker-compose -f docker-compose.test.yml ps | grep -q "Up"; then
        print_warning "Docker services not running. Starting..."
        docker-compose -f docker-compose.test.yml up -d
        sleep 5
        print_success "Docker services started"
    else
        print_success "Docker services already running"
    fi
}

# Run specific test suite
run_tests() {
    local test_type=$1

    case $test_type in
        unit)
            print_header "Running Unit Tests"
            pnpm run test:unit
            ;;
        integration)
            print_header "Running Integration Tests"
            check_docker_services
            pnpm run test:integration
            ;;
        e2e)
            print_header "Running E2E Tests"
            check_docker_services
            pnpm run test:e2e
            ;;
        performance)
            print_header "Running Performance Tests"
            check_docker_services
            pnpm run test:performance
            ;;
        security)
            print_header "Running Security Tests"
            pnpm run test:security
            ;;
        regression)
            print_header "Running Regression Tests"
            check_docker_services
            pnpm run test:regression
            ;;
        all)
            print_header "Running All Tests"
            check_docker_services
            pnpm run test:ci
            ;;
        coverage)
            print_header "Running Tests with Coverage"
            check_docker_services
            pnpm run test:coverage
            ;;
        *)
            print_error "Unknown test type: $test_type"
            echo "Usage: $0 [unit|integration|e2e|performance|security|regression|all|coverage]"
            exit 1
            ;;
    esac
}

# Main execution
main() {
    if [ $# -eq 0 ]; then
        print_error "No test type specified"
        echo "Usage: $0 [unit|integration|e2e|performance|security|regression|all|coverage]"
        exit 1
    fi

    TEST_TYPE=$1

    # Print environment info
    print_header "Environment Information"
    echo "Node version: $(node --version)"
    echo "pnpm version: $(pnpm --version)"
    echo "Test type: $TEST_TYPE"
    echo ""

    # Run tests
    if run_tests "$TEST_TYPE"; then
        print_success "All tests passed!"
        exit 0
    else
        print_error "Tests failed!"
        exit 1
    fi
}

# Run main function
main "$@"
