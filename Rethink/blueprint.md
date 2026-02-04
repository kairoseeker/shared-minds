# Blueprint: Thought Weaver

## 1. Overview

Thought Weaver is a web-based, infinite canvas mind-mapping application. It allows users to create a visual network of interconnected ideas, called "thoughts." The application is designed for fluid brainstorming and organizing information, featuring an intuitive pan-and-zoom interface and an intelligent automatic layout system.

## 2. Project Outline

This document details the final, stable version of the Thought Weaver application. All code is contained within a single `index.html` file for simplicity and robustness.

### 2.1. Core Functionality

- **Infinite Canvas:** Users can freely pan and zoom to navigate their mind map.
- **Thought Creation:** Users can create a central "main thought" and branch out by adding child thoughts to any existing node.
- **Visual Connections:** Lines are automatically drawn to visually connect parent and child thoughts, creating a clear hierarchical structure.

### 2.2. Design and User Experience

- **Modern Aesthetics:** The application uses the 'Inter' typeface and a clean, dark-mode design with a subtle dot grid background for a polished look and feel.
- **Node Styling:**
    - **Default State:** Thought nodes are dark gray with light text.
    - **Parent State:** When a node becomes a parent (i.e., it has children), it changes to a white background with black text, making it visually distinct.
    - **Interaction:** Nodes have a subtle shadow that deepens on hover, giving them a "lifted" interactive feel.
- **Line Styling:**
    - **Sub-Thought Lines:** Lines connecting a parent to a childless node are thin and dashed.
    - **Parent-Thought Lines:** As soon as a node has its own children, the line connecting it to its parent becomes a thick, solid white line, representing its status as a sub-branch.

### 2.3. Key Features

- **Pan and Zoom:**
    - **Panning:** Click and drag the canvas background to pan the view.
    - **Zooming:** Use the mouse wheel or trackpad to zoom in and out. The zoom is centered on the mouse cursor for intuitive navigation.
- **Automatic Spiral Layout:**
    - To prevent clutter, new thoughts are not placed randomly. They are automatically positioned in an outward spiral (using the golden angle) around their parent node.
    - The layout algorithm checks for collisions and adjusts the radius to ensure new thoughts do not overlap with existing ones.
- **Single Input Form:** A single, permanent `<input>` field is used for all text entry. It is shown at the correct position and scale when needed and hidden after use. This robust design avoids the bugs related to dynamically creating and destroying input elements.

### 2.4. Code Architecture

- **Single-File Structure:** All HTML, CSS, and JavaScript are contained within `index.html`. This eliminates dependencies and simplifies the codebase.
- **Web Component (`<thought-node>`):** Thought nodes are implemented as a custom HTML element for clean, semantic markup and encapsulated logic.
- **SVG for Lines:** Lines are drawn using SVG paths within a dedicated `<svg>` container that sits behind the thought nodes.
- **State Management:** The application state (including all thoughts, their positions, and relationships) is managed in a simple JavaScript array.

## 3. Current Implementation Plan (Completed)

This plan outlines the final, successful implementation of the application.

1.  **Foundation Reset:** All previous failed attempts (multiple files, complex `z-index` logic) were deleted.
2.  **Create Single `index.html`:** A new, self-contained `index.html` was created to house all HTML, CSS, and JavaScript.
3.  **Implement Core HTML Structure:** Set up the basic `div` containers for the canvas, thoughts, and a single, permanent `<input>` field.
4.  **Implement Core CSS:** Style the core elements with a simple, functional design. Add the final, polished styles including the font, background, and node/line appearances.
5.  **Implement Core JavaScript Logic (The Stable Baseline):**
    *   Write the `createThought` function.
    *   Implement the `showInput`/`hideInputAndSave` logic using the permanent input field, **eliminating the critical bug from previous attempts.**
    *   Write the `updateLines` function to draw SVG connections.
6.  **Layer on Pan-and-Zoom:**
    *   Add event listeners for `mousedown`, `mousemove`, `mouseup`, and `wheel`.
    *   Introduce `panX`, `panY`, and `scale` variables.
    *   Create an `applyTransform` function to update the canvas position.
    *   Adjust input positioning and thought creation logic to work correctly with the transformed coordinates.
7.  **Implement Final Features:**
    *   Refactor the thought creation to use a `<thought-node>` custom element.
    *   Implement the automatic spiral layout algorithm in the `promptForNewThought` function.
    *   Finalize the CSS to differentiate between parent and sub-thought lines and nodes.
