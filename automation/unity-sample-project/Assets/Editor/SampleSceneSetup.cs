#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

[InitializeOnLoad]
public static class SampleSceneSetup
{
    static SampleSceneSetup()
    {
        EditorApplication.delayCall += EnsureSampleObjects;
    }

    private static void EnsureSampleObjects()
    {
        // Only act on the default untitled scene
        var scene = EditorSceneManager.GetActiveScene();
        if (!string.IsNullOrEmpty(scene.path))
        {
            return;
        }

        // Create AvatarRoot if missing (used by automation scenario)
        if (GameObject.Find("AvatarRoot") == null)
        {
            var root = new GameObject("AvatarRoot");
            var body = new GameObject("Body");
            body.transform.SetParent(root.transform);
            Debug.Log("[SampleSceneSetup] Created AvatarRoot hierarchy for automation testing.");
        }
    }
}
#endif
