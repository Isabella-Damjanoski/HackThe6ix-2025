"""
DrawDx Backend Server
AI-powered pain analysis system
"""

from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import os
import json
import base64
from datetime import datetime
import openai
import logging

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

app.config.from_object(Config)

# Initialize OpenAI client (if API key is available)
if Config.OPENAI_API_KEY:
    openai.api_key = Config.OPENAI_API_KEY
    logger.info("OpenAI API configured")
else:
    logger.warning("OpenAI API key not found - using demo mode")

# Medical knowledge base for demo purposes
MEDICAL_KNOWLEDGE = {
    "body_regions": {
        "head_neck": {
            "anatomical_structures": ["Skull", "Cervical vertebrae", "Neck muscles", "TMJ", "Cranial nerves"],
            "common_conditions": ["Tension headache", "Migraine", "Neck strain", "TMJ disorder"]
        },
        "torso": {
            "anatomical_structures": ["Ribs", "Thoracic vertebrae", "Lungs", "Heart", "Abdominal organs"],
            "common_conditions": ["Muscle strain", "Costochondritis", "Pneumonia", "Heart conditions"]
        },
        "arms": {
            "anatomical_structures": ["Shoulder joint", "Humerus", "Elbow", "Forearm", "Hand"],
            "common_conditions": ["Rotator cuff injury", "Tennis elbow", "Carpal tunnel", "Arthritis"]
        },
        "pelvis": {
            "anatomical_structures": ["Hip bones", "Sacrum", "Hip joints", "Pelvic muscles"],
            "common_conditions": ["Hip bursitis", "Sacroiliac dysfunction", "Pelvic floor dysfunction"]
        },
        "legs": {
            "anatomical_structures": ["Femur", "Knee joint", "Tibia", "Fibula", "Foot bones"],
            "common_conditions": ["Knee arthritis", "Shin splints", "Plantar fasciitis", "Sciatica"]
        }
    },
    "pain_types": {
        "sharp": ["Nerve compression", "Acute injury", "Inflammation"],
        "dull": ["Muscle strain", "Chronic conditions", "Deep tissue issues"],
        "burning": ["Nerve damage", "Inflammation", "Acid reflux"],
        "throbbing": ["Vascular issues", "Migraine", "Infection"],
        "cramping": ["Muscle spasms", "Digestive issues", "Menstrual pain"],
        "tingling": ["Nerve compression", "Poor circulation", "Vitamin deficiency"]
    }
}

@app.route('/')
def index():
    """Serve the main application page"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory('.', filename)

@app.route('/analyze', methods=['POST'])
def analyze_symptoms():
    """Main analysis endpoint - processes pain data and returns medical insights"""
    try:
        data = request.get_json()
        
        if not data or 'painAreas' not in data:
            return jsonify({'error': 'No pain data provided'}), 400
        
        logger.info(f"Analyzing symptoms for {len(data['painAreas'])} pain areas")
        
        # Process the pain data
        analysis_result = process_pain_analysis(data)
        
        return jsonify(analysis_result)
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return jsonify({'error': 'Analysis failed', 'details': str(e)}), 500

def process_pain_analysis(data):
    """Process pain areas and generate medical analysis"""
    
    pain_areas = data.get('painAreas', [])
    symptom_description = data.get('symptomDescription', '')
    
    # Analyze body regions affected
    affected_regions = analyze_body_regions(pain_areas)
    
    # Generate possible conditions
    possible_conditions = generate_condition_hypotheses(pain_areas, symptom_description)
    
    # Generate recommendations
    recommendations = generate_recommendations(pain_areas, symptom_description)
    
    # Use AI if available, otherwise use rule-based analysis
    if Config.OPENAI_API_KEY:
        ai_analysis = get_ai_analysis(pain_areas, symptom_description)
        # Combine AI analysis with rule-based analysis
        return combine_analyses(affected_regions, possible_conditions, recommendations, ai_analysis)
    else:
        return {
            'affectedAreas': affected_regions,
            'possibleConditions': possible_conditions,
            'recommendations': recommendations,
            'urgencyLevel': determine_urgency_level(pain_areas),
            'followUpTimeframe': determine_followup_timeframe(pain_areas),
            'analysisMethod': 'rule-based'
        }

def analyze_body_regions(pain_areas):
    """Analyze which body regions are affected"""
    affected_regions = []
    region_counts = {}
    
    for pain_area in pain_areas:
        regions = pain_area.get('bodyRegion', [])
        intensity = pain_area.get('intensity', 2)
        pain_type = pain_area.get('painType', 'dull')
        
        for region in regions:
            if region not in region_counts:
                region_counts[region] = {
                    'count': 0,
                    'max_intensity': 0,
                    'pain_types': set()
                }
            
            region_counts[region]['count'] += 1
            region_counts[region]['max_intensity'] = max(region_counts[region]['max_intensity'], intensity)
            region_counts[region]['pain_types'].add(pain_type)
    
    # Convert to readable format
    region_map = {
        'head_neck': 'Head and Neck',
        'torso': 'Chest and Upper Back',
        'arms': 'Arms and Shoulders',
        'pelvis': 'Lower Back and Pelvis',
        'legs': 'Legs and Feet'
    }
    
    for region, data in region_counts.items():
        region_name = region_map.get(region, region.replace('_', ' ').title())
        anatomical_structures = MEDICAL_KNOWLEDGE['body_regions'].get(region, {}).get('anatomical_structures', [])
        
        severity = 'Mild'
        if data['max_intensity'] >= 3:
            severity = 'Severe'
        elif data['max_intensity'] >= 2:
            severity = 'Moderate'
        
        affected_regions.append({
            'region': region_name,
            'anatomicalStructures': anatomical_structures,
            'severity': severity,
            'painTypes': list(data['pain_types'])
        })
    
    return affected_regions

def generate_condition_hypotheses(pain_areas, symptom_description):
    """Generate possible medical conditions based on pain patterns"""
    conditions = []
    
    # Extract patterns from pain areas
    regions_affected = set()
    max_intensity = 0
    pain_types = set()
    
    for pain_area in pain_areas:
        regions_affected.update(pain_area.get('bodyRegion', []))
        max_intensity = max(max_intensity, pain_area.get('intensity', 2))
        pain_types.add(pain_area.get('painType', 'dull'))
    
    # Rule-based condition matching
    if 'torso' in regions_affected:
        if 'sharp' in pain_types:
            conditions.append({
                'name': 'Intercostal Muscle Strain',
                'probability': 'Medium (60%)',
                'description': 'Strain of muscles between the ribs, often from sudden movement or coughing.',
                'icd10': 'S29.019A'
            })
        
        if 'burning' in pain_types:
            conditions.append({
                'name': 'Gastroesophageal Reflux (GERD)',
                'probability': 'Medium (45%)',
                'description': 'Stomach acid irritating the esophagus, causing chest burning.',
                'icd10': 'K21.9'
            })
    
    if 'pelvis' in regions_affected:
        conditions.append({
            'name': 'Lower Back Strain',
            'probability': 'High (70%)',
            'description': 'Muscle or ligament strain in the lower back region.',
            'icd10': 'M54.5'
        })
        
        if 'legs' in regions_affected:
            conditions.append({
                'name': 'Sciatica',
                'probability': 'Medium (50%)',
                'description': 'Pain radiating along the sciatic nerve from lower back to leg.',
                'icd10': 'M54.3'
            })
    
    if 'head_neck' in regions_affected:
        if 'throbbing' in pain_types:
            conditions.append({
                'name': 'Tension Headache',
                'probability': 'High (75%)',
                'description': 'Common headache type often related to stress or muscle tension.',
                'icd10': 'G44.209'
            })
        
        if max_intensity >= 3:
            conditions.append({
                'name': 'Migraine',
                'probability': 'Medium (55%)',
                'description': 'Severe headache often accompanied by sensitivity to light and sound.',
                'icd10': 'G43.909'
            })
    
    if 'arms' in regions_affected:
        if 'tingling' in pain_types:
            conditions.append({
                'name': 'Carpal Tunnel Syndrome',
                'probability': 'Medium (40%)',
                'description': 'Compression of the median nerve in the wrist.',
                'icd10': 'G56.00'
            })
    
    # Add general conditions if no specific patterns match
    if not conditions:
        conditions.append({
            'name': 'Musculoskeletal Strain',
            'probability': 'Medium (50%)',
            'description': 'General muscle or joint strain, often from overuse or minor injury.',
            'icd10': 'M79.3'
        })
    
    return conditions[:5]  # Limit to top 5 conditions

def generate_recommendations(pain_areas, symptom_description):
    """Generate treatment and care recommendations"""
    recommendations = []
    
    # Calculate overall severity
    max_intensity = max([area.get('intensity', 2) for area in pain_areas], default=2)
    pain_types = set([area.get('painType', 'dull') for area in pain_areas])
    
    # General pain management
    if max_intensity >= 2:
        recommendations.append("Apply ice for 15-20 minutes every 2-3 hours for acute pain")
        recommendations.append("Consider over-the-counter pain relievers if medically appropriate")
    
    # Specific recommendations based on pain type
    if 'sharp' in pain_types:
        recommendations.append("Avoid sudden movements that may worsen sharp pain")
    
    if 'burning' in pain_types:
        recommendations.append("Consider position changes and avoid trigger foods if related to digestion")
    
    if 'tingling' in pain_types:
        recommendations.append("Check for circulation issues; change positions frequently")
    
    # Activity recommendations
    if max_intensity <= 2:
        recommendations.append("Gentle movement and stretching as tolerated")
        recommendations.append("Continue normal activities if possible")
    else:
        recommendations.append("Rest and avoid aggravating activities")
        recommendations.append("Consider modified duties or activities")
    
    # General health recommendations
    recommendations.append("Stay hydrated and maintain good posture")
    recommendations.append("Monitor symptoms and track any changes")
    
    # Medical consultation recommendations
    if max_intensity >= 3:
        recommendations.append("Consult healthcare provider promptly for severe pain")
    else:
        recommendations.append("Consult healthcare provider if symptoms persist beyond 3-5 days")
    
    recommendations.append("Seek immediate medical attention if pain is accompanied by fever, weakness, or other concerning symptoms")
    
    return recommendations

def determine_urgency_level(pain_areas):
    """Determine the urgency level of the condition"""
    max_intensity = max([area.get('intensity', 2) for area in pain_areas], default=2)
    
    if max_intensity >= 3:
        return "Moderate urgency"
    elif max_intensity >= 2:
        return "Non-urgent"
    else:
        return "Low priority"

def determine_followup_timeframe(pain_areas):
    """Determine appropriate follow-up timeframe"""
    max_intensity = max([area.get('intensity', 2) for area in pain_areas], default=2)
    
    if max_intensity >= 3:
        return "24-48 hours if no improvement"
    elif max_intensity >= 2:
        return "1-2 weeks if no improvement"
    else:
        return "2-3 weeks if symptoms persist"

def get_ai_analysis(pain_areas, symptom_description):
    """Get AI-powered analysis using OpenAI API"""
    try:
        # Prepare the prompt for the AI
        prompt = create_medical_analysis_prompt(pain_areas, symptom_description)
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are a medical AI assistant helping to analyze patient symptoms. Provide educational information only and always recommend consulting with healthcare professionals. Do not provide definitive diagnoses."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=1000,
            temperature=0.3
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"AI analysis error: {str(e)}")
        return None

def create_medical_analysis_prompt(pain_areas, symptom_description):
    """Create a structured prompt for AI analysis"""
    
    pain_summary = []
    for i, area in enumerate(pain_areas):
        regions = ', '.join(area.get('bodyRegion', ['unspecified']))
        intensity = area.get('intensity', 2)
        pain_type = area.get('painType', 'unspecified')
        
        pain_summary.append(f"Area {i+1}: {regions} region, intensity {intensity}/3, {pain_type} pain")
    
    prompt = f"""
    Please analyze the following patient pain presentation:
    
    PAIN AREAS:
    {chr(10).join(pain_summary)}
    
    ADDITIONAL SYMPTOMS:
    {symptom_description if symptom_description else 'None provided'}
    
    Please provide:
    1. Most likely anatomical structures involved
    2. Top 3 possible conditions with likelihood percentages
    3. Recommended immediate care steps
    4. When to seek medical attention
    
    Remember to emphasize this is educational information only and professional medical consultation is needed for diagnosis.
    """
    
    return prompt

def combine_analyses(affected_regions, possible_conditions, recommendations, ai_analysis):
    """Combine rule-based and AI analyses"""
    result = {
        'affectedAreas': affected_regions,
        'possibleConditions': possible_conditions,
        'recommendations': recommendations,
        'analysisMethod': 'hybrid'
    }
    
    if ai_analysis:
        result['aiInsights'] = ai_analysis
    
    return result

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'ai_enabled': bool(Config.OPENAI_API_KEY)
    })

@app.route('/api/regions', methods=['GET'])
def get_body_regions():
    """Get available body regions and their anatomical structures"""
    return jsonify(MEDICAL_KNOWLEDGE['body_regions'])

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting DrawDx server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
