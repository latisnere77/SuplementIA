#!/bin/bash

# Master Maintenance Script
# Provides an interactive menu to run maintenance tasks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          SuplementIA Maintenance System                     ║"
echo "║          Ongoing System Health & Optimization               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Function to display menu
show_menu() {
    echo "Select a maintenance task:"
    echo ""
    echo "  1) Weekly Review          - System health check"
    echo "  2) Monthly Cost Analysis  - Cost breakdown and optimization"
    echo "  3) Quarterly Testing      - Comprehensive testing suite"
    echo "  4) View Recent Reports    - Browse maintenance reports"
    echo "  5) Run All Tasks          - Execute all maintenance tasks"
    echo "  6) Setup Automation       - Configure cron jobs"
    echo "  7) Help                   - View documentation"
    echo "  8) Exit"
    echo ""
}

# Function to run weekly review
run_weekly_review() {
    echo -e "${GREEN}Running Weekly Review...${NC}"
    echo ""
    
    if [ -f "${SCRIPT_DIR}/weekly-review.sh" ]; then
        "${SCRIPT_DIR}/weekly-review.sh"
    else
        echo -e "${RED}Error: weekly-review.sh not found${NC}"
        return 1
    fi
}

# Function to run monthly cost analysis
run_monthly_cost() {
    echo -e "${GREEN}Running Monthly Cost Analysis...${NC}"
    echo ""
    
    if [ -f "${SCRIPT_DIR}/monthly-cost-analysis.sh" ]; then
        "${SCRIPT_DIR}/monthly-cost-analysis.sh"
    else
        echo -e "${RED}Error: monthly-cost-analysis.sh not found${NC}"
        return 1
    fi
}

# Function to run quarterly testing
run_quarterly_testing() {
    echo -e "${GREEN}Running Quarterly Testing...${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  This may take 20-30 minutes${NC}"
    echo ""
    read -p "Continue? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        if [ -f "${SCRIPT_DIR}/quarterly-testing.sh" ]; then
            "${SCRIPT_DIR}/quarterly-testing.sh"
        else
            echo -e "${RED}Error: quarterly-testing.sh not found${NC}"
            return 1
        fi
    else
        echo "Cancelled"
    fi
}

# Function to view recent reports
view_reports() {
    echo -e "${GREEN}Recent Maintenance Reports${NC}"
    echo ""
    
    REPORT_DIR="${SCRIPT_DIR}/reports"
    
    if [ -d "$REPORT_DIR" ]; then
        echo "Weekly Reviews:"
        ls -lht "$REPORT_DIR"/weekly-review-*.md 2>/dev/null | head -5 || echo "  No reports found"
        echo ""
        
        echo "Monthly Cost Analysis:"
        ls -lht "$REPORT_DIR"/cost-analysis-*.md 2>/dev/null | head -5 || echo "  No reports found"
        echo ""
        
        echo "Quarterly Testing:"
        ls -lht "$REPORT_DIR"/quarterly-testing-*.md 2>/dev/null | head -5 || echo "  No reports found"
        echo ""
        
        read -p "View a report? (enter filename or press Enter to skip): " filename
        
        if [ -n "$filename" ]; then
            if [ -f "$REPORT_DIR/$filename" ]; then
                less "$REPORT_DIR/$filename"
            else
                echo -e "${RED}File not found${NC}"
            fi
        fi
    else
        echo "No reports directory found"
        echo "Run maintenance tasks to generate reports"
    fi
}

# Function to run all tasks
run_all_tasks() {
    echo -e "${GREEN}Running All Maintenance Tasks${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  This will run:${NC}"
    echo "  1. Weekly Review (~5 min)"
    echo "  2. Monthly Cost Analysis (~10 min)"
    echo "  3. Quarterly Testing (~30 min)"
    echo ""
    echo "Total estimated time: ~45 minutes"
    echo ""
    read -p "Continue? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        echo ""
        echo "═══════════════════════════════════════"
        echo "Task 1/3: Weekly Review"
        echo "═══════════════════════════════════════"
        run_weekly_review
        
        echo ""
        echo "═══════════════════════════════════════"
        echo "Task 2/3: Monthly Cost Analysis"
        echo "═══════════════════════════════════════"
        run_monthly_cost
        
        echo ""
        echo "═══════════════════════════════════════"
        echo "Task 3/3: Quarterly Testing"
        echo "═══════════════════════════════════════"
        run_quarterly_testing
        
        echo ""
        echo -e "${GREEN}✅ All maintenance tasks complete!${NC}"
    else
        echo "Cancelled"
    fi
}

# Function to setup automation
setup_automation() {
    echo -e "${GREEN}Setup Automation${NC}"
    echo ""
    echo "To automate maintenance tasks, add these cron jobs:"
    echo ""
    echo -e "${YELLOW}# Weekly review every Monday at 9 AM${NC}"
    echo "0 9 * * 1 cd ${SCRIPT_DIR} && ./weekly-review.sh"
    echo ""
    echo -e "${YELLOW}# Monthly cost analysis on the 1st at 10 AM${NC}"
    echo "0 10 1 * * cd ${SCRIPT_DIR} && ./monthly-cost-analysis.sh"
    echo ""
    echo -e "${YELLOW}# Quarterly testing on Jan 1, Apr 1, Jul 1, Oct 1 at 11 AM${NC}"
    echo "0 11 1 1,4,7,10 * cd ${SCRIPT_DIR} && ./quarterly-testing.sh"
    echo ""
    read -p "Add these to crontab now? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        # Create temporary cron file
        TEMP_CRON=$(mktemp)
        
        # Get existing crontab
        crontab -l > "$TEMP_CRON" 2>/dev/null || true
        
        # Add new jobs if not already present
        if ! grep -q "weekly-review.sh" "$TEMP_CRON"; then
            echo "# SuplementIA Weekly Review" >> "$TEMP_CRON"
            echo "0 9 * * 1 cd ${SCRIPT_DIR} && ./weekly-review.sh" >> "$TEMP_CRON"
        fi
        
        if ! grep -q "monthly-cost-analysis.sh" "$TEMP_CRON"; then
            echo "# SuplementIA Monthly Cost Analysis" >> "$TEMP_CRON"
            echo "0 10 1 * * cd ${SCRIPT_DIR} && ./monthly-cost-analysis.sh" >> "$TEMP_CRON"
        fi
        
        if ! grep -q "quarterly-testing.sh" "$TEMP_CRON"; then
            echo "# SuplementIA Quarterly Testing" >> "$TEMP_CRON"
            echo "0 11 1 1,4,7,10 * cd ${SCRIPT_DIR} && ./quarterly-testing.sh" >> "$TEMP_CRON"
        fi
        
        # Install new crontab
        crontab "$TEMP_CRON"
        rm "$TEMP_CRON"
        
        echo -e "${GREEN}✅ Cron jobs added successfully!${NC}"
        echo ""
        echo "View crontab: crontab -l"
    else
        echo "Skipped"
    fi
}

# Function to show help
show_help() {
    echo -e "${GREEN}Maintenance System Help${NC}"
    echo ""
    echo "For detailed documentation, see:"
    echo "  ${SCRIPT_DIR}/README.md"
    echo ""
    echo "Quick reference:"
    echo ""
    echo "Weekly Review:"
    echo "  - Checks system health"
    echo "  - Monitors metrics"
    echo "  - Identifies issues"
    echo "  - Duration: ~5 minutes"
    echo ""
    echo "Monthly Cost Analysis:"
    echo "  - Analyzes AWS costs"
    echo "  - Compares with budget"
    echo "  - Provides optimization tips"
    echo "  - Duration: ~10 minutes"
    echo ""
    echo "Quarterly Testing:"
    echo "  - Comprehensive test suite"
    echo "  - Security audit"
    echo "  - Performance validation"
    echo "  - Duration: ~30 minutes"
    echo ""
    echo "Reports are saved in: ${SCRIPT_DIR}/reports/"
    echo ""
    read -p "Press Enter to continue..."
}

# Main loop
while true; do
    show_menu
    read -p "Enter choice [1-8]: " choice
    echo ""
    
    case $choice in
        1)
            run_weekly_review
            ;;
        2)
            run_monthly_cost
            ;;
        3)
            run_quarterly_testing
            ;;
        4)
            view_reports
            ;;
        5)
            run_all_tasks
            ;;
        6)
            setup_automation
            ;;
        7)
            show_help
            ;;
        8)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    clear
done
