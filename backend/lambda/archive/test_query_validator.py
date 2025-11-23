"""
Tests Unitarios para Query Validator
Ejecutar con: python test_query_validator.py
"""

import sys
from query_validator import validate_supplement_query, sanitize_query, is_valid_query


class TestColors:
    """ANSI color codes para terminal"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'


def test_valid_supplements():
    """Test: Suplementos válidos deben pasar"""
    valid_queries = [
        'ashwagandha',
        'omega-3',
        'vitamin-d',
        'magnesium',
        'creatine',
        'melatonin',
        'cbd',
        'protein',
        'zinc',
        'vitamin-c',
    ]

    print(f"{TestColors.BLUE}TEST: Suplementos válidos{TestColors.RESET}")
    passed = 0
    failed = 0

    for query in valid_queries:
        result = validate_supplement_query(query)
        if result.valid:
            print(f"  {TestColors.GREEN}✓{TestColors.RESET} '{query}' -> válido")
            passed += 1
        else:
            print(f"  {TestColors.RED}✗{TestColors.RESET} '{query}' -> inválido (ERROR!)")
            print(f"    Razón: {result.error}")
            failed += 1

    return passed, failed


def test_valid_categories():
    """Test: Categorías válidas deben pasar"""
    valid_queries = [
        'sleep',
        'cognitive',
        'muscle-gain',
        'energy',
        'immune',
        'heart',
        'stress',
        'anxiety',
    ]

    print(f"\n{TestColors.BLUE}TEST: Categorías válidas{TestColors.RESET}")
    passed = 0
    failed = 0

    for query in valid_queries:
        result = validate_supplement_query(query)
        if result.valid:
            print(f"  {TestColors.GREEN}✓{TestColors.RESET} '{query}' -> válido")
            passed += 1
        else:
            print(f"  {TestColors.RED}✗{TestColors.RESET} '{query}' -> inválido (ERROR!)")
            print(f"    Razón: {result.error}")
            failed += 1

    return passed, failed


def test_blocked_terms():
    """Test: Términos bloqueados deben ser rechazados"""
    blocked_queries = [
        'pizza recipe',
        'cocaine',
        'ibuprofen',
        'xanax',
        'bomb',
        'marijuana',
        'steroid',
        'methamphetamine',
    ]

    print(f"\n{TestColors.BLUE}TEST: Términos bloqueados{TestColors.RESET}")
    passed = 0
    failed = 0

    for query in blocked_queries:
        result = validate_supplement_query(query)
        if not result.valid and result.severity == 'blocked':
            print(f"  {TestColors.GREEN}✓{TestColors.RESET} '{query}' -> bloqueado correctamente")
            passed += 1
        else:
            print(f"  {TestColors.RED}✗{TestColors.RESET} '{query}' -> NO fue bloqueado (ERROR!)")
            failed += 1

    return passed, failed


def test_suspicious_patterns():
    """Test: Patrones sospechosos deben ser rechazados"""
    suspicious_queries = [
        'how to make bomb',
        'recipe for cocaine',
        'como hacer bomba',
        'receta de pizza',
    ]

    print(f"\n{TestColors.BLUE}TEST: Patrones sospechosos{TestColors.RESET}")
    passed = 0
    failed = 0

    for query in suspicious_queries:
        result = validate_supplement_query(query)
        if not result.valid:
            print(f"  {TestColors.GREEN}✓{TestColors.RESET} '{query}' -> bloqueado correctamente")
            passed += 1
        else:
            print(f"  {TestColors.RED}✗{TestColors.RESET} '{query}' -> NO fue bloqueado (ERROR!)")
            failed += 1

    return passed, failed


def test_edge_cases():
    """Test: Casos especiales"""
    test_cases = [
        ('', False, 'Query vacío'),
        ('a', False, 'Query muy corto'),
        ('x' * 101, False, 'Query muy largo'),
        ('  ashwagandha  ', True, 'Query con espacios'),
        ('OMEGA-3', True, 'Query en mayúsculas'),
        ('Vitamin D', True, 'Query con espacio'),
    ]

    print(f"\n{TestColors.BLUE}TEST: Casos especiales{TestColors.RESET}")
    passed = 0
    failed = 0

    for query, should_be_valid, description in test_cases:
        result = validate_supplement_query(query)
        if result.valid == should_be_valid:
            status = 'válido' if result.valid else 'inválido'
            print(f"  {TestColors.GREEN}✓{TestColors.RESET} {description} -> {status}")
            passed += 1
        else:
            print(f"  {TestColors.RED}✗{TestColors.RESET} {description} -> ERROR")
            print(f"    Esperado: {'válido' if should_be_valid else 'inválido'}")
            print(f"    Obtenido: {'válido' if result.valid else 'inválido'}")
            if result.error:
                print(f"    Error: {result.error}")
            failed += 1

    return passed, failed


def test_sanitization():
    """Test: Sanitización de queries"""
    test_cases = [
        ('  ashwagandha  ', 'ashwagandha'),
        ('omega<script>3', 'omegascript>3'),  # Remove <
        ('x' * 150, 'x' * 100),  # Truncate to 100
    ]

    print(f"\n{TestColors.BLUE}TEST: Sanitización{TestColors.RESET}")
    passed = 0
    failed = 0

    for input_query, expected_output in test_cases:
        result = sanitize_query(input_query)
        if result == expected_output:
            print(f"  {TestColors.GREEN}✓{TestColors.RESET} '{input_query[:20]}...' -> sanitizado correctamente")
            passed += 1
        else:
            print(f"  {TestColors.RED}✗{TestColors.RESET} '{input_query[:20]}...' -> ERROR")
            print(f"    Esperado: '{expected_output[:50]}'")
            print(f"    Obtenido: '{result[:50]}'")
            failed += 1

    return passed, failed


def main():
    """Run all tests"""
    print(f"\n{'='*60}")
    print(f"{TestColors.YELLOW}TESTS UNITARIOS - Query Validator{TestColors.RESET}")
    print(f"{'='*60}\n")

    total_passed = 0
    total_failed = 0

    # Run all test suites
    test_suites = [
        test_valid_supplements,
        test_valid_categories,
        test_blocked_terms,
        test_suspicious_patterns,
        test_edge_cases,
        test_sanitization,
    ]

    for test_suite in test_suites:
        passed, failed = test_suite()
        total_passed += passed
        total_failed += failed

    # Summary
    print(f"\n{'='*60}")
    print(f"{TestColors.YELLOW}RESUMEN{TestColors.RESET}")
    print(f"{'='*60}")
    print(f"  Total tests: {total_passed + total_failed}")
    print(f"  {TestColors.GREEN}✓ Passed: {total_passed}{TestColors.RESET}")
    print(f"  {TestColors.RED}✗ Failed: {total_failed}{TestColors.RESET}")

    if total_failed == 0:
        print(f"\n{TestColors.GREEN}🎉 ¡Todos los tests pasaron!{TestColors.RESET}\n")
        return 0
    else:
        print(f"\n{TestColors.RED}❌ Algunos tests fallaron{TestColors.RESET}\n")
        return 1


if __name__ == '__main__':
    sys.exit(main())
