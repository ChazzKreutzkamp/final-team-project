import React, { useState, useEffect } from "react";
import Auth from "../utils/auth";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/react-hooks";
import { QUERY_GET_PROJECT_INFO } from "../utils/queries";
import { UPDATE_CURRENT_PROJECT, UPDATE_CHAPTERS } from "../utils/actions";
import { UPVOTE_PROJECT, ADD_APPLICANT } from "../utils/mutations";
import { useStoreContext } from "../utils/GlobalState";
import { idbPromise } from "../utils/helpers";
import { Link } from "react-router-dom";
import Button from "react-bootstrap/Button";
const ReadProject = () => {
  const [state, dispatch] = useStoreContext();
  const [upvoteProject] = useMutation(UPVOTE_PROJECT);
  const [addApplicant] = useMutation(ADD_APPLICANT);
  const { currentProject, chapters } = state;
  const [success, setSuccess] = useState(false);
  let [upvotes, setupvotes] = useState(0);
  const [upvoteSuccess, setUpvoteSuccess] = useState(false);
  let userId;
  if (Auth.loggedIn()) {
    userId = Auth.getProfile().data._id;
  }
  const { projectId } = useParams();

  //Queries
  const { loading, data: projectInfo } = useQuery(QUERY_GET_PROJECT_INFO, {
    variables: { _id: projectId },
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    if (projectInfo) {
      const project = projectInfo?.getProjectInfo;
      dispatch({
        type: UPDATE_CURRENT_PROJECT,
        currentProject: project,
      });
      idbPromise("currentProject", "put", project);
      dispatch({
        type: UPDATE_CHAPTERS,
        chapters: project.chapters,
      });
      project.chapters.forEach((chapter) => {
        idbPromise("projectChapters", "put", chapter);
      });
      setupvotes(project.upvoteCount);
    } else if (!loading) {
      idbPromise("currentProject", "get").then((currentProject) => {
        dispatch({
          type: UPDATE_CURRENT_PROJECT,
          currentProject: currentProject,
        });
        setupvotes(currentProject.upvoteCount);
      });
      idbPromise("projectChapters", "get").then((projectChapters) => {
        dispatch({
          type: UPDATE_CHAPTERS,
          chapters: projectChapters,
        });
      });
    }
  }, [projectInfo, loading, dispatch]);

  const addUpvote = async (event) => {
    event.preventDefault();
    await upvoteProject({
      variables: { projectId: currentProject._id, userId: userId },
    });
    dispatch({
      type: UPDATE_CURRENT_PROJECT,
      currentProject: currentProject,
    });
    dispatch({
      type: UPDATE_CHAPTERS,
      chapters: currentProject.chapters,
    });
    if (!upvoteSuccess) {
      upvotes = currentProject.upvoteCount;
    }
    setUpvoteSuccess(true);
  };
  const applyCollaboration = async (event) => {
    event.preventDefault();
    try {
      await addApplicant({
        variables: { projectId: currentProject._id, userId: userId },
      });
      dispatch({
        type: UPDATE_CURRENT_PROJECT,
        currentProject: currentProject,
      });
      dispatch({
        type: UPDATE_CHAPTERS,
        chapters: currentProject.chapters,
      });
      setSuccess(true);
    } catch (e) {
      console.error(e);
    }
  };
  //The Actual returned HTML
  if (loading) {
    return <div>Loading...</div>;
  }
  if (!loading) {
    return (
      <div>
        <h1 className="Header">{currentProject.title}</h1>
        <h2 className="readHeader">By: {currentProject.authorName}</h2>
        <h3 className="summary">Summary</h3>
        <p className="readSummary">{currentProject.summary}</p>
        {chapters && (
          <div>
            {chapters.filter((chapter) => chapter.isPublic).length > 0 && (
              <div>
                <h3 className="chapterHeader">
                  Public Chapters For Your Enjoyment
                </h3>
                <ul className="chapterBullet">
                  {chapters.filter((chapter) => chapter.isPublic).map((chapter) => (
                    <li>
                      <Link
                        className="chapterLink"
                        key={chapter._id}
                        to={`/readchapter/${chapter._id}`}
                      >
                        {chapter.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {chapters.filter((chapter) => chapter.isPublic).length === 0 && (
              <div>
                <h3>
                  This project currently doesn't have any public chapters...
                </h3>
              </div>
            )}
          </div>
        )}
        <h3 className="chapterHeader">
          This Project Currently has: {upvotes} Upvotes
        </h3>
        {Auth.loggedIn() && (
          <div className="upvoteButtonDiv">
            {!upvoteSuccess ? (
              <Button
                variant="info"
                className="upvoteButton"
                onClick={addUpvote}
              >
                Like this project? Click Here to upvote it.
              </Button>
            ) : (
                <Button variant="success" className="upvoteButton">
                  You just liked this project.
                </Button>
              )}
          </div>
        )}
        {currentProject.collaborators &&
          currentProject.collaborators.length > 0 && (
            <div>
              {currentProject.collaborators.length > 0 && (
                <div>
                  <h3 className="text-center">Project Collaborators</h3>
                  <ul className="chapterBullet">
                    {currentProject.collaborators.map((collaborator) => (
                      <li key={collaborator._id}>{collaborator.username}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        {Auth.loggedIn() && (
          <div className="upvoteButtonDiv">
            {!success ? (
              <Button
                variant="info"
                className="upvoteButton"
                onClick={applyCollaboration}
              >
                Want to be a collaborator? Click Here.
              </Button>
            ) : (
                <Button variant="success" className="upvoteButton">
                  Application Submitted! Please wait for the author to accept or
                  deny your request.
                </Button>
              )}
          </div>
        )}
      </div>
    );
  }
  return <div>Loading...</div>;
};

export default ReadProject;
