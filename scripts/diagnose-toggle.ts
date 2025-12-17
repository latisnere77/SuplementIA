/**
 * Diagnose ViewToggle visibility issue
 * Run in browser console on results page
 */

// Check if ViewToggle is in DOM
const checkToggle = () => {
  console.log('🔍 Checking ViewToggle...');
  
  // Look for toggle buttons
  const buttons = document.querySelectorAll('button');
  const toggleButtons = Array.from(buttons).filter(btn => 
    btn.textContent?.includes('Vista Estándar') || 
    btn.textContent?.includes('Vista Cuantitativa')
  );
  
  console.log('Toggle buttons found:', toggleButtons.length);
  
  if (toggleButtons.length > 0) {
    toggleButtons.forEach((btn, i) => {
      console.log(`Button ${i + 1}:`, {
        text: btn.textContent,
        visible: btn.offsetParent !== null,
        display: window.getComputedStyle(btn).display,
        opacity: window.getComputedStyle(btn).opacity,
        position: btn.getBoundingClientRect(),
      });
    });
  } else {
    console.log('❌ No toggle buttons found in DOM');
    
    // Check if transformedEvidence exists in React state
    console.log('Checking React state...');
    console.log('Look for "transformedEvidence" in React DevTools');
  }
  
  // Check for ViewToggle container
  const containers = document.querySelectorAll('.flex.gap-2.mb-6');
  console.log('Potential toggle containers:', containers.length);
  
  containers.forEach((container, i) => {
    console.log(`Container ${i + 1}:`, {
      html: container.innerHTML.substring(0, 100),
      visible: container.offsetParent !== null,
    });
  });
};

checkToggle();

export {};
