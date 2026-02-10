import React, { useState } from 'react';

const ProjectForm = ({ addProject }) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !subject) return;
    addProject({ title, subject });
    setTitle('');
    setSubject('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
      <input
        type="text"
        placeholder="Project Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ flex: 2, padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
      />
      <input
        type="text"
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        style={{ flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
      />
      <button type="submit">Add Project</button>
    </form>
  );
};

export default ProjectForm;
