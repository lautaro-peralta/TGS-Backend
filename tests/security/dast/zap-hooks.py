#!/usr/bin/env python
"""
OWASP ZAP Hooks for TGS Backend
These hooks customize ZAP's behavior during scanning
Documentation: https://www.zaproxy.org/docs/desktop/addons/python-scripting/
"""

def zap_started(zap, target):
    """
    Called when ZAP has started
    """
    print(f"[HOOK] ZAP started, targeting: {target}")

    # Set global configurations
    zap.core.set_option_timeout_in_secs(30)
    zap.core.set_option_single_cookie_request_header_enabled(True)

    print("[HOOK] Global ZAP configuration applied")


def zap_pre_shutdown(zap):
    """
    Called before ZAP shuts down
    """
    print("[HOOK] ZAP shutting down, cleaning up...")


def zap_spider_started(zap, url):
    """
    Called when the spider starts
    """
    print(f"[HOOK] Spider started for URL: {url}")


def zap_spider_completed(zap):
    """
    Called when the spider completes
    """
    # Get spider results
    results = zap.spider.results()
    urls_found = len(results) if results else 0

    print(f"[HOOK] Spider completed. URLs found: {urls_found}")


def zap_scanner_started(zap, url):
    """
    Called when active scanning starts
    """
    print(f"[HOOK] Active scanner started for URL: {url}")

    # Configure scanner for API testing
    zap.ascan.set_option_max_scan_duration_in_mins(30)
    zap.ascan.set_option_thread_per_host(2)
    zap.ascan.set_option_delay_in_ms(0)

    print("[HOOK] Active scanner configuration applied")


def zap_scanner_completed(zap):
    """
    Called when active scanning completes
    """
    print("[HOOK] Active scanner completed")


def zap_alerts(zap):
    """
    Called to process alerts
    Customize alert handling here
    """
    alerts = zap.core.alerts()

    if not alerts:
        print("[HOOK] No alerts found")
        return

    # Count alerts by risk level
    high = len([a for a in alerts if a['risk'] == 'High'])
    medium = len([a for a in alerts if a['risk'] == 'Medium'])
    low = len([a for a in alerts if a['risk'] == 'Low'])
    info = len([a for a in alerts if a['risk'] == 'Informational'])

    print(f"[HOOK] Alerts summary:")
    print(f"  High: {high}")
    print(f"  Medium: {medium}")
    print(f"  Low: {low}")
    print(f"  Info: {info}")

    # Log high-risk alerts
    if high > 0:
        print("[HOOK] High-risk vulnerabilities detected:")
        for alert in [a for a in alerts if a['risk'] == 'High']:
            print(f"  - {alert['name']} at {alert['url']}")


def zap_automation_plan_started(zap, plan):
    """
    Called when automation plan starts
    """
    print(f"[HOOK] Automation plan started: {plan}")


def zap_automation_plan_finished(zap, plan):
    """
    Called when automation plan finishes
    """
    print(f"[HOOK] Automation plan finished: {plan}")
