import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/react-hooks";
import { useParams, Link, useHistory } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

import AuthService from "../utils/auth";
import { useStoreContext } from "../utils/GlobalState";
import Collaborators from "../components/Collaborators";
import CollaboratorsToConsider from "../components/CollaboratorsToConsider";
import IsPublicToggleButton from "../components/IsPublicToggleButton";
import TableOfContents from "../components/TableOfContents";
import {
  UPDATE_CURRENT_PROJECT,
  UPDATE_CHAPTERS,
  ADD_SINGLE_CHAPTER,
} from "../utils/actions";
import { QUERY_GET_PROJECT_INFO } from "../utils/queries";
import {
  EDIT_PROJECT_INFO,
  ADD_CHAPTER,
  DELETE_PROJECT,
} from "../utils/mutations";
import { idbPromise } from "../utils/helpers";

const EditProject = () => {
  // Use the global state to get currentProject
  const [state, dispatch] = useStoreContext();
  const { currentProject } = state;

  // Gets the data of the logged in user
  const { data: userProfile } = AuthService.getProfile();

  // Pull projectId from url
  const { projectId } = useParams();

  // Sets up the history variable
  let history = useHistory();

  // Variables for using queries and mutations
  const { loading, data: projectInfo } = useQuery(QUERY_GET_PROJECT_INFO, {
    variables: { _id: projectId },
    fetchPolicy: 'cache-and-network'
  });
  const [editProjectInfo] = useMutation(EDIT_PROJECT_INFO);
  const [addChapter] = useMutation(ADD_CHAPTER);
  const [deleteProject] = useMutation(DELETE_PROJECT);

  // Variables for local state
  const [success, setSuccess] = useState(false);
  const [updatedData, setUpdatedData] = useState({
    title: "",
    genre: "",
    summary: "",
    isPublic: false,
  });

  // Variables & functions for modal (taken from docs)
  const [show, setShow] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalChapterText, setModalChapterText] = useState("");

  const handleShow = () => {
    setShow(true);
  };

  const handleClose = () => {
    setShow(false);
  };

  const handleModalChange = (evt) => {
    const name = evt.target.id;
    const value = evt.target.value;

    if (name === "modalTitle") {
      setModalTitle(value);
    } else {
      setModalChapterText(value);
    }
  };

  useEffect(() => {
    // If the server has returned project info
    if (projectInfo) {
      const project = projectInfo?.getProjectInfo;

      dispatch({
        type: UPDATE_CURRENT_PROJECT,
        currentProject: project,
      });

      dispatch({
        type: UPDATE_CHAPTERS,
        chapters: project.chapters,
      });

      setUpdatedData({
        title: project.title,
        genre: project.genre,
        summary: project.summary,
        isPublic: project.isPublic,
      });

      idbPromise("currentProject", "clear");
      idbPromise("currentProject", "put", project);

      idbPromise("projectChapters", "clear");
      project.chapters.forEach((chapter) =>
        idbPromise("projectChapters", "put", chapter)
      );
    }
    // If the user is offline
    else if (!loading) {
      idbPromise("currentProject", "get").then((project) => {
        dispatch({
          type: UPDATE_CURRENT_PROJECT,
          currentProject: project,
        });
      });

      idbPromise("projectChapters", "get").then((chapters) => {
        dispatch({
          type: UPDATE_CHAPTERS,
          chapters,
        });
      });
    }
  }, [projectInfo, loading, dispatch]);

  // Handles any changes to local state
  const handleChange = async (evt) => {
    const name = evt.target.id;
    const value = evt.target.value;

    if (name === "projectIsPublic") {
      setUpdatedData({
        ...updatedData,
        isPublic: !updatedData.isPublic,
      });
    } else if (name === "projectTitle") {
      setUpdatedData({
        ...updatedData,
        title: value,
      });
    } else if (name === "projectGenre") {
      setUpdatedData({
        ...updatedData,
        genre: value,
      });
    } else {
      setUpdatedData({
        ...updatedData,
        summary: value,
      });
    }
  };

  const handleAddChapter = async () => {
    const { data } = await addChapter({
      variables: {
        projectId,
        title: modalTitle,
        chapterText: modalChapterText,
        authorName: currentProject.authorName,
      },
    });
    const newChapter = data?.addChapter;

    setShow(false);

    await dispatch({
      type: ADD_SINGLE_CHAPTER,
      chapter: newChapter,
    });

    idbPromise("projectChapters", "put", newChapter);

    // window.location.reload();
    history.push(`/editchapter/${newChapter._id}`);
  };

  const handleDelete = async () => {
    await deleteProject({
      variables: { _id: projectId },
    });

    history.push("/projects");
  };

  // Submits changes to the server via mutation
  const submitChanges = async () => {
    const { data } = await editProjectInfo({
      variables: {
        projectId,
        title: updatedData.title,
        summary: updatedData.summary,
        genre: updatedData.genre,
        isPublic: updatedData.isPublic,
      },
    });
    const newProject = data?.editProjectInfo;

    await dispatch({
      type: UPDATE_CURRENT_PROJECT,
      currentProject: newProject,
    });

    setSuccess(true);

    setTimeout(function () {
      setSuccess(false);
    }, 5000);

    idbPromise("currentProject", "put", newProject);
  };

  return (
    <Container fluid className="editContainer">
      <Row style={{ justifyContent: "space-between" }}>
        <Link to={`/projects`} style={{ color: "white" }}>
          <Button>Back to Your Projects</Button>
        </Link>

        {/* If the project owner is logged in, render a delete button */}
        {currentProject.authorName === userProfile.username && (
          <Button onClick={handleDelete}>Delete This Project</Button>
        )}
      </Row>
      <Row style={{ justifyContent: "center" }}>
        <h1 className="Header" style={{ borderBottom: "solid" }}>
          Editing Project: {currentProject.title}
        </h1>
      </Row>
      <Row style={{ justifyContent: "center" }}>
        <p className="title">By: {currentProject.authorName}</p>
      </Row>
      <Row>
        {/* Table of Contents */}
        <Col sm={12} md={2}>
          <TableOfContents projectId={projectId} />
          <Button variant="warning" onClick={handleShow}>
            Add Chapter
          </Button>

          {/* Add Chapter Modal JSX */}
          <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
              <Modal.Title>Add Chapter to {currentProject.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Form.Group controlId="modalTitle">
                  <Form.Label>Title:</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={1}
                    onChange={handleModalChange}
                  ></Form.Control>
                </Form.Group>
                <Form.Group controlId="modalChapterText">
                  <Form.Label>Content:</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={20}
                    onChange={handleModalChange}
                  ></Form.Control>
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="danger" onClick={handleClose}>
                Close
              </Button>
              <Button variant="info" onClick={handleAddChapter}>
                Add Chapter!
              </Button>
            </Modal.Footer>
          </Modal>
        </Col>

        {/* Edit Project */}
        {loading ? (
          // If the projectInfo is loading
          <div>Loading...</div>
        ) : (
          // If the projectInfo is available
          <Col sm={12} md={8}>
            <Form>
              {/* IsPublic toggle */}
              <IsPublicToggleButton
                updatedData={updatedData}
                setUpdatedData={setUpdatedData}
              />

              {/* Project title, genre, and summary changes */}
              <Form.Row>
                <Col sm={10} md={10}>
                  <Form.Group controlId="projectTitle">
                    <Form.Label className="editFormLabel">Title:</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={1}
                      defaultValue={currentProject.title}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>

                <Col sm={2}>
                  <Form.Group controlId="projectGenre">
                    <Form.Label className="editFormLabel">Genre:</Form.Label>
                    <Form.Control
                      as="select"
                      key={currentProject.genre}
                      defaultValue={currentProject.genre}
                      onChange={handleChange}
                    >
                      <option value="Action/Adventure">Action/Adventure</option>
                      <option value="Fantasy">Fantasy</option>
                      <option value="Historical Fiction">
                        Historical Fiction
                      </option>
                      <option value="Literary Fiction">Literary Fiction</option>
                      <option value="Romance">Romance</option>
                      <option value="Science Fiction">Science Fiction</option>
                      <option value="Short Story">Short Story</option>
                      <option value="Suspense/Thriller">
                        Suspense/Thriller
                      </option>
                      <option value="Women's Fiction">Women's Fiction</option>
                      <option value="Biography">Biography</option>
                      <option value="Autobiography">Autobiography</option>
                      <option value="Cookbook">Cookbook</option>
                      <option value="Essay">Essay</option>
                      <option value="History">History</option>
                      <option value="Memoir">Memoir</option>
                      <option value="Poetry">Poetry</option>
                      <option value="Self Help">Self Help</option>
                      <option value="True Crime">True Crime</option>
                    </Form.Control>
                  </Form.Group>
                </Col>
              </Form.Row>

              <Form.Group controlId="projectSummary">
                <Form.Label className="editFormLabel">Summary:</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={10}
                  onChange={handleChange}
                  defaultValue={currentProject.summary}
                />
              </Form.Group>

              {/* Submit button */}
              {!success ? (
                <Button variant="info" onClick={submitChanges}>
                  Submit Changes
                </Button>
              ) : (
                <Button variant="success">Submitted!</Button>
              )}
            </Form>
          </Col>
        )}

        {/* Display any relevant collaborator info */}
        <Col sm={12} md={2}>
          {loading ? (
            // If the projectInfo is loading
            <div>Loading...</div>
          ) : (
            <div>
              <Collaborators />
              <CollaboratorsToConsider projectId={projectId} />
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default EditProject;
