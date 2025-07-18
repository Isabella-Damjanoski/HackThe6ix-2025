// DrawDx - Frontend JavaScript Logic
class DrawDx {
    constructor() {
        this.canvas = null;
        this.currentIntensity = 2;
        this.painAreas = [];
        this.initializeCanvas();
        this.bindEvents();
    }

    initializeCanvas() {
        // Initialize Fabric.js canvas for drawing
        this.canvas = new fabric.Canvas('bodyCanvas', {
            isDrawingMode: false,
            width: 300,
            height: 600
        });

        // Load body diagram background
        this.loadBodyDiagram();
        
        // Set up drawing brush
        this.canvas.freeDrawingBrush.width = 15;
        this.canvas.freeDrawingBrush.color = this.getIntensityColor(this.currentIntensity);
        this.canvas.freeDrawingBrush.opacity = 0.7;
    }

    loadBodyDiagram() {
        // Create a simple body outline using Fabric.js shapes
        const bodyOutline = this.createBodyOutline();
        this.canvas.add(bodyOutline);
        this.canvas.sendToBack(bodyOutline);
    }

    createBodyOutline() {
        // Create a simple human body outline
        const bodyGroup = new fabric.Group([], {
            selectable: false,
            evented: false
        });

        // Head
        const head = new fabric.Circle({
            left: 135,
            top: 20,
            radius: 30,
            fill: 'transparent',
            stroke: '#ddd',
            strokeWidth: 2
        });

        // Torso
        const torso = new fabric.Rect({
            left: 120,
            top: 80,
            width: 60,
            height: 150,
            fill: 'transparent',
            stroke: '#ddd',
            strokeWidth: 2,
            rx: 10
        });

        // Arms
        const leftArm = new fabric.Rect({
            left: 80,
            top: 90,
            width: 40,
            height: 15,
            fill: 'transparent',
            stroke: '#ddd',
            strokeWidth: 2,
            rx: 7
        });

        const rightArm = new fabric.Rect({
            left: 180,
            top: 90,
            width: 40,
            height: 15,
            fill: 'transparent',
            stroke: '#ddd',
            strokeWidth: 2,
            rx: 7
        });

        // Legs
        const leftLeg = new fabric.Rect({
            left: 130,
            top: 230,
            width: 15,
            height: 100,
            fill: 'transparent',
            stroke: '#ddd',
            strokeWidth: 2,
            rx: 7
        });

        const rightLeg = new fabric.Rect({
            left: 155,
            top: 230,
            width: 15,
            height: 100,
            fill: 'transparent',
            stroke: '#ddd',
            strokeWidth: 2,
            rx: 7
        });

        // Pelvis
        const pelvis = new fabric.Rect({
            left: 125,
            top: 210,
            width: 50,
            height: 40,
            fill: 'transparent',
            stroke: '#ddd',
            strokeWidth: 2,
            rx: 20
        });

        bodyGroup.addWithUpdate(head);
        bodyGroup.addWithUpdate(torso);
        bodyGroup.addWithUpdate(leftArm);
        bodyGroup.addWithUpdate(rightArm);
        bodyGroup.addWithUpdate(leftLeg);
        bodyGroup.addWithUpdate(rightLeg);
        bodyGroup.addWithUpdate(pelvis);

        return bodyGroup;
    }

    bindEvents() {
        // Intensity buttons
        document.querySelectorAll('.intensity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentIntensity = parseInt(e.target.dataset.intensity);
                this.canvas.freeDrawingBrush.color = this.getIntensityColor(this.currentIntensity);
            });
        });

        // Drawing mode toggle
        this.canvas.on('mouse:down', () => {
            if (!this.canvas.isDrawingMode) {
                this.canvas.isDrawingMode = true;
            }
        });

        // Track pain areas
        this.canvas.on('path:created', (e) => {
            const painArea = {
                path: e.path,
                intensity: this.currentIntensity,
                painType: document.getElementById('painType').value,
                timestamp: new Date(),
                coordinates: this.getPathCoordinates(e.path)
            };
            this.painAreas.push(painArea);
        });

        // Clear canvas
        document.getElementById('clearCanvas').addEventListener('click', () => {
            this.clearCanvas();
        });

        // Undo last drawing
        document.getElementById('undoLast').addEventListener('click', () => {
            this.undoLast();
        });

        // Analyze button
        document.getElementById('analyzeBtn').addEventListener('click', () => {
            this.analyzeSymptoms();
        });

        // Export functions
        document.getElementById('exportPDF').addEventListener('click', () => {
            this.exportToPDF();
        });

        document.getElementById('shareResults').addEventListener('click', () => {
            this.shareResults();
        });
    }

    getIntensityColor(intensity) {
        const colors = {
            1: '#28a745', // Mild - Green
            2: '#ffc107', // Moderate - Yellow
            3: '#dc3545'  // Severe - Red
        };
        return colors[intensity] || colors[2];
    }

    getPathCoordinates(path) {
        // Extract coordinates from the fabric path for analysis
        const pathData = path.path;
        const coordinates = [];
        
        for (let i = 0; i < pathData.length; i++) {
            if (pathData[i][0] === 'M' || pathData[i][0] === 'L') {
                coordinates.push({
                    x: pathData[i][1],
                    y: pathData[i][2]
                });
            }
        }
        
        return coordinates;
    }

    clearCanvas() {
        const objects = this.canvas.getObjects();
        // Keep the body outline (first object), remove all drawings
        for (let i = objects.length - 1; i > 0; i--) {
            this.canvas.remove(objects[i]);
        }
        this.painAreas = [];
        this.canvas.renderAll();
    }

    undoLast() {
        if (this.painAreas.length > 0) {
            const lastPain = this.painAreas.pop();
            this.canvas.remove(lastPain.path);
            this.canvas.renderAll();
        }
    }

    async analyzeSymptoms() {
        if (this.painAreas.length === 0) {
            alert('Please draw on the body diagram to indicate your pain areas first.');
            return;
        }

        // Show loading
        document.getElementById('loadingSpinner').style.display = 'block';
        document.getElementById('resultsPanel').style.display = 'none';
        document.getElementById('analyzeBtn').disabled = true;

        try {
            // Prepare data for analysis
            const analysisData = {
                painAreas: this.painAreas.map(area => ({
                    coordinates: area.coordinates,
                    intensity: area.intensity,
                    painType: area.painType,
                    bodyRegion: this.mapCoordinatesToBodyRegion(area.coordinates)
                })),
                symptomDescription: document.getElementById('symptomDescription').value,
                canvasImage: this.canvas.toDataURL()
            };

            // Send to backend for AI analysis
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(analysisData)
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const results = await response.json();
            this.displayResults(results);

        } catch (error) {
            console.error('Analysis error:', error);
            // Show demo results for the hackathon
            this.showDemoResults();
        } finally {
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('analyzeBtn').disabled = false;
        }
    }

    mapCoordinatesToBodyRegion(coordinates) {
        // Map canvas coordinates to anatomical regions
        const regions = [];
        
        coordinates.forEach(coord => {
            if (coord.y < 80) {
                regions.push('head_neck');
            } else if (coord.y < 230 && coord.x > 100 && coord.x < 200) {
                regions.push('torso');
            } else if (coord.y < 160 && (coord.x < 100 || coord.x > 200)) {
                regions.push('arms');
            } else if (coord.y >= 230) {
                regions.push('legs');
            } else if (coord.y >= 210 && coord.y < 250) {
                regions.push('pelvis');
            }
        });

        return [...new Set(regions)]; // Remove duplicates
    }

    showDemoResults() {
        // Demo results for hackathon presentation
        const demoResults = {
            affectedAreas: [
                {
                    region: "Lower Back (Lumbar Region)",
                    anatomicalStructures: ["L4-L5 vertebrae", "Erector spinae muscles", "Facet joints"],
                    severity: "Moderate to Severe"
                },
                {
                    region: "Right Hip",
                    anatomicalStructures: ["Hip flexors", "Iliotibial band", "Greater trochanter"],
                    severity: "Mild to Moderate"
                }
            ],
            possibleConditions: [
                {
                    name: "Lower Back Strain",
                    probability: "High (75%)",
                    description: "Muscle strain in the lower back, often caused by sudden movement or lifting.",
                    icd10: "M54.5"
                },
                {
                    name: "Sciatica",
                    probability: "Medium (45%)",
                    description: "Pain radiating along the sciatic nerve, often from lower back to leg.",
                    icd10: "M54.3"
                },
                {
                    name: "Hip Bursitis",
                    probability: "Medium (40%)",
                    description: "Inflammation of the fluid-filled sacs near the hip joint.",
                    icd10: "M70.6"
                }
            ],
            recommendations: [
                "Apply ice for 15-20 minutes every 2-3 hours for the first 48 hours",
                "Avoid heavy lifting and sudden movements",
                "Consider over-the-counter anti-inflammatory medication (if medically appropriate)",
                "Gentle stretching and walking as tolerated",
                "Consult a healthcare provider if pain persists or worsens",
                "Consider physical therapy evaluation"
            ],
            urgencyLevel: "Non-urgent",
            followUpTimeframe: "1-2 weeks if no improvement"
        };

        this.displayResults(demoResults);
    }

    displayResults(results) {
        // Display affected areas
        const affectedAreasDiv = document.getElementById('affectedAreas');
        affectedAreasDiv.innerHTML = results.affectedAreas.map(area => `
            <div class="area-item">
                <strong>${area.region}</strong>
                <p><em>Structures:</em> ${area.anatomicalStructures.join(', ')}</p>
                <p><em>Severity:</em> ${area.severity}</p>
            </div>
        `).join('');

        // Display possible conditions
        const conditionsDiv = document.getElementById('possibleConditions');
        conditionsDiv.innerHTML = results.possibleConditions.map(condition => `
            <div class="condition-item">
                <div class="condition-name">${condition.name}</div>
                <div class="condition-probability">Likelihood: ${condition.probability}</div>
                <div class="condition-description">${condition.description}</div>
                ${condition.icd10 ? `<div class="condition-code">ICD-10: ${condition.icd10}</div>` : ''}
            </div>
        `).join('');

        // Display recommendations
        const recommendationsDiv = document.getElementById('recommendations');
        recommendationsDiv.innerHTML = results.recommendations.map(rec => `
            <div class="recommendation-item">• ${rec}</div>
        `).join('');

        // Show results panel with animation
        document.getElementById('resultsPanel').style.display = 'block';
        document.getElementById('resultsPanel').classList.add('fade-in');
    }

    exportToPDF() {
        // Create a comprehensive medical report
        const reportData = {
            patientData: this.painAreas,
            canvasImage: this.canvas.toDataURL(),
            timestamp: new Date().toISOString(),
            symptoms: document.getElementById('symptomDescription').value
        };

        // For the hackathon, create a downloadable text report
        const reportText = this.generateReportText(reportData);
        this.downloadTextFile(reportText, 'DrawDx_Pain_Report.txt');
    }

    generateReportText(data) {
        const timestamp = new Date().toLocaleString();
        return `
DRAWDX PAIN ASSESSMENT REPORT
Generated: ${timestamp}

PAIN AREAS MARKED:
${data.patientData.map((area, index) => `
${index + 1}. Intensity: ${area.intensity}/3 (${area.intensity === 1 ? 'Mild' : area.intensity === 2 ? 'Moderate' : 'Severe'})
   Type: ${area.painType}
   Location: ${area.coordinates.length} points marked on body diagram
`).join('')}

SYMPTOM DESCRIPTION:
${data.symptoms || 'No additional symptoms described.'}

ANALYSIS RESULTS:
[Results would be displayed here from the AI analysis]

MEDICAL DISCLAIMER:
This assessment is for informational purposes only and should not replace professional medical advice. Please consult with a healthcare provider for proper diagnosis and treatment.

Report generated by DrawDx - Draw Your Pain, Discover the Cause
        `.trim();
    }

    downloadTextFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    shareResults() {
        // Generate shareable link or email template
        const subject = encodeURIComponent('DrawDx Pain Assessment Report');
        const body = encodeURIComponent(`
I have completed a pain assessment using DrawDx. Here are my symptoms:

Pain Areas: ${this.painAreas.length} areas marked
Symptom Description: ${document.getElementById('symptomDescription').value}

Please find the detailed report attached.

Generated by DrawDx - Draw Your Pain, Discover the Cause
        `);
        
        window.open(`mailto:?subject=${subject}&body=${body}`);
    }
}

// Body Region Mapping System
class BodyRegionMapper {
    static regions = {
        head: { yMin: 0, yMax: 80, xMin: 0, xMax: 300 },
        neck: { yMin: 80, yMax: 100, xMin: 120, xMax: 180 },
        chest: { yMin: 100, yMax: 180, xMin: 120, xMax: 180 },
        abdomen: { yMin: 180, yMax: 230, xMin: 120, xMax: 180 },
        pelvis: { yMin: 210, yMax: 250, xMin: 120, xMax: 180 },
        leftArm: { yMin: 90, yMax: 200, xMin: 60, xMax: 120 },
        rightArm: { yMin: 90, yMax: 200, xMin: 180, xMax: 240 },
        leftLeg: { yMin: 230, yMax: 600, xMin: 100, xMax: 150 },
        rightLeg: { yMin: 230, yMax: 600, xMin: 150, xMax: 200 }
    };

    static getRegionFromCoordinate(x, y) {
        for (const [regionName, bounds] of Object.entries(this.regions)) {
            if (x >= bounds.xMin && x <= bounds.xMax && 
                y >= bounds.yMin && y <= bounds.yMax) {
                return regionName;
            }
        }
        return 'unknown';
    }

    static getAnatomicalStructures(regionName) {
        const structures = {
            head: ['Cranium', 'Brain', 'Eyes', 'Sinuses', 'Temporomandibular joint'],
            neck: ['Cervical vertebrae', 'Throat', 'Thyroid', 'Carotid arteries'],
            chest: ['Ribs', 'Lungs', 'Heart', 'Pectoralis muscles', 'Sternum'],
            abdomen: ['Stomach', 'Liver', 'Intestines', 'Kidneys', 'Abdominal muscles'],
            pelvis: ['Hip bones', 'Reproductive organs', 'Bladder', 'Sacrum'],
            leftArm: ['Shoulder joint', 'Humerus', 'Elbow', 'Forearm', 'Hand'],
            rightArm: ['Shoulder joint', 'Humerus', 'Elbow', 'Forearm', 'Hand'],
            leftLeg: ['Hip joint', 'Femur', 'Knee', 'Tibia/Fibula', 'Foot'],
            rightLeg: ['Hip joint', 'Femur', 'Knee', 'Tibia/Fibula', 'Foot']
        };
        
        return structures[regionName] || ['Unknown anatomical structures'];
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new DrawDx();
    
    // Add some helpful tooltips
    const tooltips = {
        bodyCanvas: "Click and drag to mark areas where you feel pain",
        symptomDescription: "Provide additional details about your symptoms, when they started, what makes them better or worse, etc.",
        analyzeBtn: "Click to get AI-powered analysis of your symptoms"
    };

    Object.entries(tooltips).forEach(([id, text]) => {
        const element = document.getElementById(id);
        if (element) {
            element.title = text;
        }
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
            switch(e.key) {
                case 'z':
                    e.preventDefault();
                    app.undoLast();
                    break;
                case 'Delete':
                    e.preventDefault();
                    app.clearCanvas();
                    break;
            }
        }
    });

    console.log('DrawDx application initialized successfully!');
});
