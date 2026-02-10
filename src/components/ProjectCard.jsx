import React from "react";

const ProjectCard = ({ project }) => {
  return (
    <div className="project-card">
      <h3>{project.title}</h3>
      <p>Subject: {project.subject}</p>
    </div>
  );
};

export default ProjectCard;
