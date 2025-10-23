// File: flattenCriteria.js
const admin = require('firebase-admin');
// QUAN TRỌNG: Đảm bảo bạn có file serviceAccountKey.json trong cùng thư mục
const serviceAccount = require('./service-account-credentials.json'); 

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    if (error.code === 'app/duplicate-app') {
        console.log('Admin SDK already initialized.');
    } else {
        process.exit(1); // Exit if initialization failed for other reasons
    }
}


const db = admin.firestore();

async function flattenCriteria() {
    console.log('Starting criteria flattening process...');
    const criteriaRef = db.collection('criteria');
    const snapshot = await criteriaRef.get();

    if (snapshot.empty) {
        console.log('No documents found in "criteria" collection.');
        return;
    }

    const batch = db.batch();
    const criteriaToUpdate = []; // Store updates to avoid modifying snapshot during iteration

    snapshot.forEach(doc => {
        const criterion = doc.data();
        const criterionId = doc.id;
        let needsUpdate = false;
        const newIndicators = [];
        const indicatorsToAdd = []; // Store new indicators created from contents

        console.log(`\nProcessing Criterion: ${criterion.name} (${criterionId})`);

        criterion.indicators.forEach((indicator, index) => {
            // Check if this indicator has contents to flatten
            if (indicator.contents && Array.isArray(indicator.contents) && indicator.contents.length > 0) {
                needsUpdate = true;
                console.log(`  - Found indicator with contents: "${indicator.name}" (ID: ${indicator.id}) at index ${index}. Converting contents to indicators.`);

                // Create new indicators from contents
                indicator.contents.forEach((content, contentIndex) => {
                    // **ID Logic:** Use content's ID directly as the new indicator's ID
                    const newIndicatorId = content.id; 

                    console.log(`    - Creating new indicator from content "${content.name}" (Original Content ID: ${content.id}, New Indicator ID: ${newIndicatorId})`);

                    const newIndicatorData = {
                        id: newIndicatorId,
                        name: content.name,
                        description: content.description || '', // Ensure description exists
                        standardLevel: content.standardLevel || '', // Ensure standardLevel exists
                        inputType: content.inputType || 'boolean', // Ensure inputType exists
                        evidenceRequirement: content.evidenceRequirement || '', // Ensure evidenceRequirement exists
                        // Add a reference back to the original parent indicator ID for context if needed later
                        originalParentIndicatorId: indicator.id, 
                        // Copy any other relevant fields FROM THE CONTENT
                    };
                    indicatorsToAdd.push(newIndicatorData);
                });

                // Modify the original parent indicator: Remove contents and passRule
                console.log(`    - Modifying original parent indicator "${indicator.name}" (ID: ${indicator.id}): Removing 'contents' and 'passRule'.`);
                const modifiedParentIndicator = { ...indicator };
                delete modifiedParentIndicator.contents;
                delete modifiedParentIndicator.passRule;
                // Keep the modified parent indicator in the list (it might still have assignmentType etc.)
                newIndicators.push(modifiedParentIndicator); 

            } else {
                // Indicator without contents, keep it as is
                newIndicators.push(indicator);
            }
        });

        // Add the newly created indicators to the list
        if (indicatorsToAdd.length > 0) {
            newIndicators.push(...indicatorsToAdd);
        }

        if (needsUpdate) {
            // Store the update information
            criteriaToUpdate.push({
                docRef: criteriaRef.doc(criterionId),
                updatedData: { indicators: newIndicators }
            });
            console.log(`  -> Criterion "${criterion.name}" marked for update with ${newIndicators.length} total indicators.`);
        } else {
             console.log(`  - No contents found to flatten in this criterion.`);
        }
    });

    // Apply all updates in a batch
    if (criteriaToUpdate.length > 0) {
        console.log('\nApplying updates to Firestore...');
        criteriaToUpdate.forEach(update => {
            batch.update(update.docRef, update.updatedData);
        });
        await batch.commit();
        console.log(`Successfully updated ${criteriaToUpdate.length} criteria documents.`);
    } else {
        console.log('\nNo criteria documents needed updates.');
    }

    console.log('\nCriteria flattening process finished.');
}

flattenCriteria().catch(error => {
    console.error('An error occurred during the flattening process:', error);
});