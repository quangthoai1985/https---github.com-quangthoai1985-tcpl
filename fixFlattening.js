// File: fixFlattening.js
const admin = require('firebase-admin');
const serviceAccount = require('./service-account-credentials.json'); // Đảm bảo file key đúng tên

try {
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin SDK initialized successfully.');
    } else {
         console.log('Firebase Admin SDK already initialized.');
    }
} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    process.exit(1);
}

const db = admin.firestore();

async function fixFlattening() {
    console.log('Starting flattening fix process...');
    const criteriaRef = db.collection('criteria');
    const snapshot = await criteriaRef.get();

    if (snapshot.empty) {
        console.log('No documents found in "criteria" collection.');
        return;
    }

    const batch = db.batch();
    let criteriaUpdatedCount = 0;

    for (const doc of snapshot.docs) {
        const criterion = doc.data();
        const criterionId = doc.id;
        const originalIndicators = criterion.indicators || [];
        const finalIndicators = [];
        let needsUpdate = false;

        console.log(`\nProcessing Criterion: ${criterion.name} (${criterionId})`);

        // Identify potential original parent indicators (those without originalParentIndicatorId)
        const potentialParents = originalIndicators.filter(ind => !ind.originalParentIndicatorId);
        // Identify potential children indicators (those WITH originalParentIndicatorId)
        const potentialChildren = originalIndicators.filter(ind => ind.originalParentIndicatorId);

        // Check if flattening actually happened (if there are potential children)
        if (potentialChildren.length > 0) {
            needsUpdate = true; // Mark for update if children exist
            console.log(`  - Found ${potentialChildren.length} potential child indicators. Rebuilding indicator list.`);

            potentialParents.forEach(parent => {
                // 1. Add the parent indicator (ensure it doesn't have contents/passRule)
                const cleanedParent = { ...parent };
                delete cleanedParent.contents; // Should already be deleted, but double-check
                delete cleanedParent.passRule; // Should already be deleted, but double-check
                // **Fix potential ID duplication issue from previous script run:**
                // Ensure the parent ID is the actual original parent ID, not a copied content ID
                // We assume the 'name' field correctly identifies the parent if IDs got mixed up.
                 console.log(`    - Adding parent: "${cleanedParent.name}" (ID: ${cleanedParent.id})`);
                finalIndicators.push(cleanedParent);

                // 2. Find and add children belonging to this parent, right after it
                const childrenOfParent = potentialChildren.filter(child => child.originalParentIndicatorId === parent.id);
                if (childrenOfParent.length > 0) {
                     console.log(`    - Found ${childrenOfParent.length} children for parent ${parent.id}. Adding them.`);
                    childrenOfParent.forEach(child => {
                        // Ensure child has the correct structure (basic fields)
                         const cleanedChild = {
                             id: child.id, // Keep the ID the previous script assigned (should be the content ID)
                             name: child.name,
                             description: child.description || '',
                             standardLevel: child.standardLevel || '',
                             inputType: child.inputType || 'boolean',
                             evidenceRequirement: child.evidenceRequirement || '',
                             originalParentIndicatorId: child.originalParentIndicatorId,
                             // Remove potential unwanted fields copied from parent
                             documents: undefined, // Example, adjust if needed
                             assignedDocumentsCount: undefined,
                             assignmentType: undefined,
                         };
                         // Remove undefined keys explicitly
                         Object.keys(cleanedChild).forEach(key => cleanedChild[key] === undefined && delete cleanedChild[key]);

                         console.log(`      - Adding child: "${cleanedChild.name}" (ID: ${cleanedChild.id})`);
                        finalIndicators.push(cleanedChild);
                    });
                } else {
                     console.log(`    - No children found for parent ${parent.id}.`);
                }
            });

             // Verify: Check if any potential children were NOT associated with a parent (orphans - indicates error)
             const allAddedChildrenIds = finalIndicators.filter(ind => ind.originalParentIndicatorId).map(ind => ind.id);
             potentialChildren.forEach(child => {
                 if (!allAddedChildrenIds.includes(child.id)) {
                     console.warn(`      - WARNING: Child indicator "${child.name}" (ID: ${child.id}) seems orphaned! It might be a leftover error.`);
                     // Optionally add orphans to the end, or investigate why they are orphaned
                     // finalIndicators.push(child); // Uncomment to keep orphans
                 }
             });

        } else {
            // No children found, assume the structure was already correct or didn't need flattening
            console.log(`  - No flattened indicators found. Keeping original structure.`);
            finalIndicators.push(...originalIndicators); // Use original list
        }


        // Only update if flattening occurred and resulted in changes
        if (needsUpdate) {
             // Check if the final structure is actually different from the original
             // (Simple check by length, could be more robust)
             if (finalIndicators.length !== originalIndicators.length || JSON.stringify(finalIndicators) !== JSON.stringify(originalIndicators)) {
                console.log(`  -> Criterion "${criterion.name}" will be updated with ${finalIndicators.length} indicators.`);
                batch.update(doc.ref, { indicators: finalIndicators });
                criteriaUpdatedCount++;
             } else {
                  console.log(`  -> Criterion "${criterion.name}" structure seems correct already. No update needed.`);
             }
        }
    }

    // Apply all updates in a batch
    if (criteriaUpdatedCount > 0) {
        console.log(`\nApplying updates to Firestore for ${criteriaUpdatedCount} criteria...`);
        await batch.commit();
        console.log(`Successfully fixed ${criteriaUpdatedCount} criteria documents.`);
    } else {
        console.log('\nNo criteria documents needed fixing based on structure analysis.');
    }

    console.log('\nFlattening fix process finished.');
}

fixFlattening().catch(error => {
    console.error('An error occurred during the fixing process:', error);
});