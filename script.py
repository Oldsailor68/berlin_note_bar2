import re

with open('d:\\AIT\\Project\\berlin-note-landing\\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add CSS for img-frame right before /* Gallery */
css_to_insert = '''
        .img-frame {
            overflow: hidden;
            border-radius: 8px;
            display: block;
            width: 100%;
        }
        .img-frame img {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
            transition: transform 0.7s ease;
        }
        .about-image:hover .img-frame img,
        .event-card:hover .img-frame img {
            transform: scale(1.05);
        }
'''
if '.img-frame {' not in content:
    content = content.replace('/* Gallery */', css_to_insert + '\n        /* Gallery */')

# Remove duplicate CSS from .about-image img
content = re.sub(
    r'\.about-image img \{[^}]+\}',
    '.about-image img {\n            display: block;\n        }',
    content
)
# Remove duplicate hover from about-image
content = re.sub(r'\.about-image:hover img \{[^}]+\}', '', content)

# Remove duplicate CSS from .event-card img
content = re.sub(
    r'\.event-card img \{[^}]+\}',
    '.event-card .img-frame {\n            height: 250px;\n        }',
    content
)

# Replace <img src=...> in .about-image
content = re.sub(
    r'(<div class="about-image">\s*)(<img [^>]+>)',
    r'\1<div class="img-frame">\n                \2\n            </div>',
    content
)

# Replace <img src=...> in .event-card
content = re.sub(
    r'(<div class="event-card(?: featured)?">\s*)(<img [^>]+>)',
    r'\1<div class="img-frame">\n                \2\n            </div>',
    content
)

with open('d:\\AIT\\Project\\berlin-note-landing\\index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Replaced HTML and CSS.')
